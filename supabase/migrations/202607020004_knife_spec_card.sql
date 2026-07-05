alter table public.knives
  add column if not exists model text not null default '',
  add column if not exists specs jsonb not null default '{}'::jsonb;

alter function public.submit_public_knife(jsonb) rename to submit_public_knife_v1;
revoke all on function public.submit_public_knife_v1(jsonb) from anon, authenticated;

create function public.submit_public_knife(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  submitted_id text;
  submitted_model text := trim(coalesce(payload->>'model', ''));
begin
  if submitted_model = '' or length(submitted_model) > 120 then
    raise exception 'model must contain 1 to 120 characters';
  end if;

  submitted_id := public.submit_public_knife_v1(payload);
  update public.knives
  set model = submitted_model,
      specs = jsonb_strip_nulls(coalesce(payload->'specs', '{}'::jsonb))
  where id = submitted_id;
  return submitted_id;
end;
$$;

revoke all on function public.submit_public_knife(jsonb) from public;
grant execute on function public.submit_public_knife(jsonb) to anon, authenticated;
