-- PRD 11.4 policy map (table/action row -> policy names):
-- User Read -> profiles_select_self_or_same_business_owner; User Update/delete -> profiles_update_self, profiles_delete_self.
-- Business Read/Create/Update-delete -> businesses_select_member, businesses_insert_without_membership, businesses_update_owner, businesses_delete_owner.
-- Membership Read/Delete -> memberships_select_member, memberships_delete_owner_or_self.
-- Invite Read/create/update -> invites_select_owner, invites_insert_owner, invites_update_owner.
-- PlanLine Read/create/update/delete -> plan_lines_select_owner, plan_lines_insert_owner, plan_lines_update_owner, plan_lines_delete_owner.
-- Transaction Read/Create/Update/Delete/Approve-reject -> transactions_select_owner_or_staff_own, transactions_insert_member, transactions_update_owner, transactions_delete_owner.
-- TransactionAudit Read (trigger-only writes) -> transaction_audits_select_owner; no client write policies.
-- Bill Read/Create-update-delete -> bills_select_member, bills_insert_owner, bills_update_owner, bills_delete_owner.
-- Flag Read/update-review (trigger-only creation) -> flags_select_owner, flags_update_owner; no client insert/delete policies.

create or replace function public.is_member_of(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.business_id = target_business_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_owner_of(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.business_id = target_business_id
      and m.user_id = auth.uid()
      and m.role = 'Owner'::public.membership_role
  );
$$;

revoke all on function public.is_member_of(uuid) from public;
revoke all on function public.is_owner_of(uuid) from public;
grant execute on function public.is_member_of(uuid) to authenticated;
grant execute on function public.is_owner_of(uuid) to authenticated;

create policy profiles_select_self_or_same_business_owner on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.memberships target_membership
      where target_membership.user_id = profiles.id
        and public.is_owner_of(target_membership.business_id)
    )
  );
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy profiles_delete_self on public.profiles
  for delete to authenticated using (id = (select auth.uid()));

create policy businesses_select_member on public.businesses
  for select to authenticated using (public.is_member_of(id));
create policy businesses_insert_without_membership on public.businesses
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and not exists (
    select 1 from public.memberships m where m.user_id = (select auth.uid())
  ));
create policy businesses_update_owner on public.businesses
  for update to authenticated using (public.is_owner_of(id))
  with check (public.is_owner_of(id));
create policy businesses_delete_owner on public.businesses
  for delete to authenticated using (public.is_owner_of(id));

create policy memberships_select_member on public.memberships
  for select to authenticated using (public.is_member_of(business_id));
create policy memberships_delete_owner_or_self on public.memberships
  for delete to authenticated using (
    (public.is_owner_of(business_id) and role = 'Staff'::public.membership_role)
    or user_id = (select auth.uid())
  );

create policy invites_select_owner on public.invites
  for select to authenticated using (public.is_owner_of(business_id));
create policy invites_insert_owner on public.invites
  for insert to authenticated with check (public.is_owner_of(business_id));
create policy invites_update_owner on public.invites
  for update to authenticated using (public.is_owner_of(business_id))
  with check (public.is_owner_of(business_id));

create policy plan_lines_select_owner on public.plan_lines
  for select to authenticated using (public.is_owner_of(business_id));
create policy plan_lines_insert_owner on public.plan_lines
  for insert to authenticated with check (public.is_owner_of(business_id));
create policy plan_lines_update_owner on public.plan_lines
  for update to authenticated using (public.is_owner_of(business_id))
  with check (public.is_owner_of(business_id));
create policy plan_lines_delete_owner on public.plan_lines
  for delete to authenticated using (public.is_owner_of(business_id));

create policy transactions_select_owner_or_staff_own on public.transactions
  for select to authenticated using (
    public.is_owner_of(business_id)
    or (created_by = (select auth.uid()) and public.is_member_of(business_id))
  );
create policy transactions_insert_member on public.transactions
  for insert to authenticated with check (
    public.is_member_of(business_id) and created_by = (select auth.uid())
  );
create policy transactions_update_owner on public.transactions
  for update to authenticated using (public.is_owner_of(business_id))
  with check (public.is_owner_of(business_id));
create policy transactions_delete_owner on public.transactions
  for delete to authenticated using (public.is_owner_of(business_id));

create policy transaction_audits_select_owner on public.transaction_audits
  for select to authenticated using (public.is_owner_of(business_id));

create policy bills_select_member on public.bills
  for select to authenticated using (public.is_member_of(business_id));
create policy bills_insert_owner on public.bills
  for insert to authenticated with check (public.is_owner_of(business_id));
create policy bills_update_owner on public.bills
  for update to authenticated using (public.is_owner_of(business_id))
  with check (public.is_owner_of(business_id));
create policy bills_delete_owner on public.bills
  for delete to authenticated using (public.is_owner_of(business_id));

create policy flags_select_owner on public.flags
  for select to authenticated using (public.is_owner_of(business_id));
create policy flags_update_owner on public.flags
  for update to authenticated using (public.is_owner_of(business_id))
  with check (public.is_owner_of(business_id));
