create or replace function public.enforce_plan_line_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if tg_op = 'UPDATE' and new.business_id = old.business_id then
    return new;
  end if;

  -- Serialize inserts for a Business so concurrent requests cannot exceed BR5.
  perform 1 from public.businesses b where b.id = new.business_id for update;
  if not found then
    raise exception 'Business not found.';
  end if;

  select count(*) into v_count
  from public.plan_lines pl
  where pl.business_id = new.business_id
    and (tg_op = 'INSERT' or pl.id <> old.id);

  if v_count >= 100 then
    raise exception 'You can have up to 100 plan lines.';
  end if;
  return new;
end;
$$;

create trigger plan_line_limit_before_write
before insert or update on public.plan_lines
for each row execute function public.enforce_plan_line_limit();

revoke all on function public.enforce_plan_line_limit() from public, anon, authenticated;
