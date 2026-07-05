-- The user requested removal of all simulated content.
truncate table public.knife_attributes, public.attributes, public.knives;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_atlas_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_atlas_admin() from public;
grant execute on function public.is_atlas_admin() to authenticated;

create policy "Admins manage knives" on public.knives
  for all to authenticated using (public.is_atlas_admin()) with check (public.is_atlas_admin());
create policy "Admins manage attributes" on public.attributes
  for all to authenticated using (public.is_atlas_admin()) with check (public.is_atlas_admin());
create policy "Admins manage links" on public.knife_attributes
  for all to authenticated using (public.is_atlas_admin()) with check (public.is_atlas_admin());

grant insert, update, delete on public.knives, public.attributes, public.knife_attributes to authenticated;

-- After creating a user in Authentication > Users, whitelist it once:
-- insert into public.admin_users(user_id) values ('AUTH-USER-UUID');
