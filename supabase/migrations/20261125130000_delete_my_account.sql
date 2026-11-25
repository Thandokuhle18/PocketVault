-- Account deletion must remove account-owned businesses despite the normal
-- transaction DELETE trigger enforcing soft deletion for ledger operations.
create or replace function public.soft_delete_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := nullif(current_setting('app.transaction_delete_reason', true), '');
begin
  if current_setting('app.delete_my_account', true) = 'on' then
    return old;
  end if;

  if not public.is_owner_of(old.business_id) then
    raise exception 'You can''t do that.';
  end if;
  if v_reason is null or char_length(v_reason) not between 3 and 200 then
    raise exception 'A delete reason of 3 to 200 characters is required';
  end if;
  update public.transactions set deleted_at = now() where id = old.id;
  return null;
end;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid;
  v_role public.membership_role;
begin
  if v_user_id is null then
    raise exception 'Please log in again.';
  end if;

  select m.business_id, m.role
    into v_business_id, v_role
    from public.memberships m
    where m.user_id = v_user_id;

  if not found then
    raise exception 'You can''t do that.';
  end if;

  if v_role = 'Owner' then
    -- These references use RESTRICT, so remove them before the Business cascade.
    delete from public.flags where business_id = v_business_id;
    delete from public.transaction_audits where business_id = v_business_id;
    -- The trigger bypass is transaction-local and only set in this function.
    perform set_config('app.delete_my_account', 'on', true);
    delete from public.businesses where id = v_business_id and owner_id = v_user_id;
    if not found then
      raise exception 'You can''t do that.';
    end if;
  end if;

  -- For Staff, FK actions clear created_by and audit actors while retaining
  -- their transactions. For Owners, their Business data was removed above.
  delete from auth.users where id = v_user_id;
  if not found then
    raise exception 'You can''t do that.';
  end if;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
