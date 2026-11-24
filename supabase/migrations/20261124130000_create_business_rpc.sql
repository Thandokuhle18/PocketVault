create or replace function public.create_business(
  p_name text,
  p_business_type text,
  p_description text,
  p_stage text,
  p_opening_balance numeric,
  p_available_capital numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  new_business_id uuid;
begin
  if caller_id is null then
    raise exception 'You must be logged in to create a business.';
  end if;

  -- Serialize concurrent setup attempts for this account before checking membership.
  perform 1 from public.profiles where id = caller_id for update;

  if exists (select 1 from public.memberships where user_id = caller_id) then
    raise exception 'This user already has a business.';
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 3 and 60 then
    raise exception 'Enter a business name of 3 to 60 characters.';
  end if;
  if p_business_type is null or p_business_type not in (
    'Bakery or catering', 'Clothing or retail', 'Beauty or barbering',
    'Car wash or cleaning', 'Spaza or general shop', 'Freelance or professional services',
    'Events or photography', 'Repairs or construction', 'Online selling', 'Farming', 'Other'
  ) then
    raise exception 'Choose a valid business type.';
  end if;
  if p_description is not null and char_length(p_description) > 200 then
    raise exception 'Enter a description of 200 characters or fewer.';
  end if;
  if p_stage is null or p_stage not in ('Idea', 'Starting', 'Operating') then
    raise exception 'Choose a valid business stage.';
  end if;
  if p_opening_balance is null or p_opening_balance < 0 or p_opening_balance > 10000000
    or p_opening_balance <> round(p_opening_balance, 2) then
    raise exception 'Enter an opening balance from R0.00 to R10,000,000.00 with at most two decimal places.';
  end if;
  if p_available_capital is null or p_available_capital < 0 or p_available_capital > 10000000
    or p_available_capital <> round(p_available_capital, 2) then
    raise exception 'Enter available capital from R0.00 to R10,000,000.00 with at most two decimal places.';
  end if;

  insert into public.businesses (name, type, description, stage, opening_balance, available_capital, owner_id)
  values (btrim(p_name), p_business_type::public.business_type, nullif(p_description, ''), p_stage::public.business_stage,
    p_opening_balance, p_available_capital, caller_id)
  returning id into new_business_id;

  insert into public.memberships (business_id, user_id, role)
  values (new_business_id, caller_id, 'Owner'::public.membership_role);

  return new_business_id;
end;
$$;

revoke execute on function public.create_business(text, text, text, text, numeric, numeric) from public;
revoke execute on function public.create_business(text, text, text, text, numeric, numeric) from anon;
grant execute on function public.create_business(text, text, text, text, numeric, numeric) to authenticated;
