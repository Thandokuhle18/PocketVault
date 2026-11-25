create or replace function public.delete_transaction(p_transaction_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to delete a transaction.';
  end if;
  if p_reason is null or char_length(p_reason) not between 3 and 200 or char_length(btrim(p_reason)) < 3 then
    raise exception 'Enter a reason of 3 to 200 characters.';
  end if;

  select t.business_id into v_business_id
  from public.transactions t
  where t.id = p_transaction_id and t.deleted_at is null;

  if not found or not public.is_owner_of(v_business_id) then
    raise exception 'You can''t do that.';
  end if;

  perform set_config('app.transaction_delete_reason', p_reason, true);
  delete from public.transactions where id = p_transaction_id;
end;
$$;

revoke execute on function public.delete_transaction(uuid, text) from public, anon;
grant execute on function public.delete_transaction(uuid, text) to authenticated;
