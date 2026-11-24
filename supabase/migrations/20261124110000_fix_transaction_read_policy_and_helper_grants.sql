-- Align transaction visibility and helper function privileges with PRD section 11.4.
revoke execute on function public.is_member_of(uuid) from public, anon;
revoke execute on function public.is_owner_of(uuid) from public, anon;
grant execute on function public.is_member_of(uuid) to authenticated;
grant execute on function public.is_owner_of(uuid) to authenticated;

drop policy if exists transactions_select_owner_or_staff_own on public.transactions;
create policy transactions_select_owner_or_staff_own on public.transactions
  for select to authenticated using (
    deleted_at is null
    and (
      public.is_owner_of(business_id)
      or (
        created_by = (select auth.uid())
        and public.is_member_of(business_id)
      )
    )
  );
