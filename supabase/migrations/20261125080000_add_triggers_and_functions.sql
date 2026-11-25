-- Issue #7: database enforcement mapped to the PRD business rules.
-- transactions_status_and_audit (INSERT/UPDATE): BR7, BR9 (status and audit)
-- transactions_soft_delete (DELETE): BR9 (soft delete and deletion reason)
-- transactions_flags (INSERT/UPDATE): BR17, BR18, BR19, BR20, BR21
-- transaction_daily_limit (INSERT): BR24
-- membership_guard (INSERT/UPDATE): BR23 (one Business per user; membership eligibility)
-- invite_staff_limit (INSERT/UPDATE): BR23 (Accepted plus Pending limit)
-- invite_accept_membership (UPDATE): BR23 (email match and signup membership)
-- bill_mark_paid (UPDATE): BR16 (expense, paid timestamp and recurring bill)
-- TransactionAudit and Flag remain client-unwritable; no write policies are added.

create or replace function public.enforce_transaction_status_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_action public.transaction_audit_action;
  v_actor uuid := auth.uid();
  v_role public.membership_role;
begin
  select m.role into v_role from public.memberships m
    where m.business_id = new.business_id and m.user_id = coalesce(v_actor, new.created_by);
  if tg_op = 'INSERT' then
    if v_role is null then raise exception 'Transaction creator must be a Business member'; end if;
    if v_actor is not null and new.created_by is distinct from v_actor then raise exception 'You can only create transactions as yourself'; end if;
    if v_actor is not null then new.created_by := v_actor; end if;
    new.created_at := now();
    new.updated_at := now();
    if v_role = 'Owner' then new.status := 'Approved';
    elsif new.type = 'Income' or new.amount < 2000 then new.status := 'Approved';
    else new.status := 'Pending'; end if;
    new.rejection_reason := null;
    new.deleted_at := null;
    v_action := 'Created';
    insert into public.transaction_audits(business_id, transaction_id, actor_id, action, new_amount)
      values (new.business_id, new.id, v_actor, v_action, new.amount);
    return new;
  end if;

  if new.business_id is distinct from old.business_id or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then raise exception 'Transaction identity fields cannot be changed'; end if;
  if new.deleted_at is distinct from old.deleted_at and new.deleted_at is not null then
    if not public.is_owner_of(old.business_id) then raise exception 'You can\'t do that.'; end if;
    if old.deleted_at is not null then raise exception 'Deleted transactions cannot be changed'; end if;
    if nullif(current_setting('app.transaction_delete_reason', true), '') is null
       or char_length(current_setting('app.transaction_delete_reason', true)) not between 3 and 200 then
      raise exception 'A delete reason of 3 to 200 characters is required';
    end if;
    if old.status = 'Approved' then
      insert into public.flags(business_id, transaction_id, rule) values (old.business_id, old.id, 'Deleted transaction');
    end if;
    new.updated_at := now();
    insert into public.transaction_audits(business_id, transaction_id, actor_id, action, old_amount, reason)
      values (old.business_id, old.id, v_actor, 'Deleted', old.amount,
        nullif(current_setting('app.transaction_delete_reason', true), ''));
    return new;
  end if;
  if new.deleted_at is distinct from old.deleted_at then raise exception 'Deleted transactions cannot be restored'; end if;
  if old.deleted_at is not null then raise exception 'Deleted transactions cannot be changed'; end if;
  if not public.is_owner_of(old.business_id) then raise exception 'You can\'t do that.'; end if;
  if old.status <> 'Pending' and new.status is distinct from old.status then raise exception 'Only Pending transactions can be approved or rejected'; end if;
  if old.status = 'Pending' and new.status = 'Rejected' then
    if new.rejection_reason is null or char_length(new.rejection_reason) not between 3 and 200 then raise exception 'A rejection reason of 3 to 200 characters is required'; end if;
    v_action := 'Rejected';
  elsif old.status = 'Pending' and new.status = 'Approved' then
    new.rejection_reason := null; v_action := 'Approved';
  else
    if new.status is distinct from old.status then raise exception 'Invalid transaction status change'; end if;
    new.rejection_reason := old.rejection_reason;
    v_action := 'Edited';
  end if;
  new.updated_at := now();
  insert into public.transaction_audits(business_id, transaction_id, actor_id, action, old_amount, new_amount, reason)
    values (old.business_id, old.id, v_actor, v_action, old.amount, new.amount,
      case when v_action = 'Rejected' then new.rejection_reason end);
  return new;
end;
$$;

create or replace function public.soft_delete_transaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_reason text := nullif(current_setting('app.transaction_delete_reason', true), '');
begin
  if not public.is_owner_of(old.business_id) then raise exception 'You can\'t do that.'; end if;
  if v_reason is null or char_length(v_reason) not between 3 and 200 then
    raise exception 'A delete reason of 3 to 200 characters is required';
  end if;
  update public.transactions set deleted_at = now() where id = old.id;
  return null;
end;
$$;

create or replace function public.enforce_transaction_flags()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_count integer; v_sum numeric;
begin
  if tg_op = 'INSERT' then
    if new.status = 'Approved' and new.payment_method = 'Cash' and new.amount >= 5000 then
      insert into public.flags(business_id, transaction_id, rule) values (new.business_id, new.id, 'Large cash');
    end if;
    if new.created_by is not null and new.type = 'Expense' and new.amount < 2000 then
      select count(*), coalesce(sum(t.amount), 0) into v_count, v_sum from public.transactions t
        where t.created_by = new.created_by and t.business_id = new.business_id and t.type = 'Expense'
          and t.category = new.category and t.transaction_date = new.transaction_date
          and t.amount < 2000 and t.deleted_at is null;
      v_count := v_count + 1; v_sum := v_sum + new.amount;
      if v_count = 3 and v_sum >= 2000 and exists (
        select 1 from public.memberships m where m.user_id = new.created_by and m.business_id = new.business_id and m.role = 'Staff'
      ) then insert into public.flags(business_id, transaction_id, rule) values (new.business_id, new.id, 'Possible split'); end if;
    end if;
    if exists (select 1 from public.transactions t where t.business_id = new.business_id and t.created_by is not distinct from new.created_by
      and t.amount = new.amount and lower(t.description) = lower(new.description) and t.transaction_date = new.transaction_date
      and t.deleted_at is null) then
      insert into public.flags(business_id, transaction_id, rule) values (new.business_id, new.id, 'Possible duplicate');
    end if;
  elsif old.amount is distinct from new.amount and old.status = 'Approved' then
    insert into public.flags(business_id, transaction_id, rule) values (old.business_id, old.id, 'Amount changed');
  elsif old.status <> 'Approved' and new.status = 'Approved' and new.payment_method = 'Cash' and new.amount >= 5000 then
    insert into public.flags(business_id, transaction_id, rule) values (new.business_id, new.id, 'Large cash');
  end if;
  return new;
end;
$$;

create or replace function public.enforce_transaction_daily_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if new.created_by is null then raise exception 'Transaction creator is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.created_by::text || (now() at time zone 'Africa/Johannesburg')::date::text, 0));
  select count(*) into v_count from public.transactions t where t.created_by = new.created_by
    and (t.created_at at time zone 'Africa/Johannesburg')::date = (now() at time zone 'Africa/Johannesburg')::date;
  if v_count >= 200 then raise exception 'You''ve reached today''s limit of 200 transactions.'; end if;
  return new;
end;
$$;

create or replace function public.enforce_membership_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id or new.business_id is distinct from old.business_id or new.role is distinct from old.role then
      raise exception 'Membership identity and role cannot be changed';
    end if;
    return new;
  end if;
  if new.role = 'Owner' then
    if not exists (select 1 from public.businesses b where b.id = new.business_id and b.owner_id = new.user_id)
       or (auth.uid() is not null and auth.uid() <> new.user_id) then raise exception 'Owner membership must match the Business owner'; end if;
  elsif new.role = 'Staff' then
    select p.email into v_email from public.profiles p where p.id = new.user_id;
    if not exists (select 1 from public.invites i where i.business_id = new.business_id and i.status = 'Pending' and lower(i.email) = lower(v_email)) then
      raise exception 'A matching pending invite is required';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_invite_staff_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if new.status = 'Pending' and (tg_op = 'INSERT' or old.status <> 'Pending') then
    perform 1 from public.businesses where id = new.business_id for update;
    select (select count(*) from public.memberships m where m.business_id = new.business_id and m.role = 'Staff')
         + (select count(*) from public.invites i where i.business_id = new.business_id and i.status = 'Pending' and (tg_op = 'INSERT' or i.id <> new.id))
      into v_count;
    if v_count >= 5 then raise exception 'You have reached the limit of 5 staff.'; end if;
  end if;
  if tg_op = 'UPDATE' and (new.business_id is distinct from old.business_id or new.email is distinct from old.email) then raise exception 'Invite identity cannot be changed'; end if;
  return new;
end;
$$;

create or replace function public.accept_matching_invites()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_invite record;
begin
  for v_invite in select i.id, i.business_id from public.invites i where i.status = 'Pending' and lower(i.email) = lower(new.email) loop
    perform 1 from public.businesses where id = v_invite.business_id for update;
    if not exists (select 1 from public.memberships where user_id = new.id) then
      insert into public.memberships(business_id, user_id, role) values (v_invite.business_id, new.id, 'Staff');
      update public.invites set status = 'Accepted' where id = v_invite.id;
      exit;
    end if;
  end loop;
  return new;
end;
$$;

create or replace function public.process_bill_paid()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_next date;
begin
  if old.status = 'Paid' or new.status <> 'Paid' then raise exception 'A bill can be marked paid once'; end if;
  if not public.is_owner_of(old.business_id) then raise exception 'You can''t do that.'; end if;
  new.paid_at := coalesce(new.paid_at, now());
  insert into public.transactions(business_id, created_by, description, amount, type, category, payment_method, transaction_date, status)
    values (old.business_id, auth.uid(), old.name, old.amount, 'Expense', old.category, 'EFT', current_date, 'Approved');
  if old.frequency <> 'Once-off' then
    v_next := case when old.frequency = 'Weekly' then old.due_date + 7 else (old.due_date + interval '1 month')::date end;
    insert into public.bills(business_id, name, amount, due_date, frequency, category, status)
      values (old.business_id, old.name, old.amount, v_next, old.frequency, old.category, 'Unpaid');
  end if;
  return new;
end;
$$;

create trigger transactions_status_and_audit before insert or update on public.transactions
for each row execute function public.enforce_transaction_status_audit();
create trigger transactions_soft_delete before delete on public.transactions
for each row execute function public.soft_delete_transaction();
create trigger transactions_flags after insert or update on public.transactions
for each row execute function public.enforce_transaction_flags();
create trigger transaction_daily_limit before insert on public.transactions
for each row execute function public.enforce_transaction_daily_limit();
create trigger membership_guard before insert or update on public.memberships
for each row execute function public.enforce_membership_rules();
create trigger invite_staff_limit before insert or update on public.invites
for each row execute function public.enforce_invite_staff_limit();
create trigger invite_accept_membership after insert on public.profiles
for each row execute function public.accept_matching_invites();
create trigger bill_mark_paid before update on public.bills
for each row when (old.status = 'Unpaid' and new.status = 'Paid') execute function public.process_bill_paid();

revoke all on function public.enforce_transaction_status_audit() from public, anon, authenticated;
revoke all on function public.soft_delete_transaction() from public, anon, authenticated;
revoke all on function public.enforce_transaction_flags() from public, anon, authenticated;
revoke all on function public.enforce_transaction_daily_limit() from public, anon, authenticated;
revoke all on function public.enforce_membership_rules() from public, anon, authenticated;
revoke all on function public.enforce_invite_staff_limit() from public, anon, authenticated;
revoke all on function public.accept_matching_invites() from public, anon, authenticated;
revoke all on function public.process_bill_paid() from public, anon, authenticated;

revoke insert, update, delete, truncate, references, trigger on public.transaction_audits from public, anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.flags from public, anon, authenticated;
