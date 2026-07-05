create table public.knives (
  id text primary key,
  sort_order integer not null default 0,
  name text not null,
  name_zh text not null,
  name_en text not null,
  year integer,
  designer text not null default '',
  blade text not null default '',
  weight text not null default '',
  description_zh text not null default '',
  description_en text not null default '',
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  verified boolean not null default false,
  verified_by jsonb not null default '[]'::jsonb check (jsonb_typeof(verified_by) = 'array'),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attributes (
  key text primary key,
  category text not null check (category in ('brand', 'material', 'lock', 'tag', 'origin')),
  qualifier text not null default '',
  value text not null,
  name_zh text not null,
  name_en text not null,
  description_zh text not null default '',
  description_en text not null default '',
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  verified boolean not null default false,
  verified_by jsonb not null default '[]'::jsonb check (jsonb_typeof(verified_by) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, qualifier, value)
);

create table public.knife_attributes (
  knife_id text not null references public.knives(id) on delete cascade,
  attribute_key text not null references public.attributes(key) on delete cascade,
  primary key (knife_id, attribute_key)
);

create index knife_attributes_attribute_key_idx on public.knife_attributes(attribute_key);
create index knives_published_sort_order_idx on public.knives(published, sort_order);

alter table public.knives enable row level security;
alter table public.attributes enable row level security;
alter table public.knife_attributes enable row level security;

create policy "Published knives are public"
  on public.knives for select to anon, authenticated
  using (published);

create policy "Attributes connected to published knives are public"
  on public.attributes for select to anon, authenticated
  using (exists (
    select 1 from public.knife_attributes ka
    join public.knives k on k.id = ka.knife_id
    where ka.attribute_key = attributes.key and k.published
  ));

create policy "Published knife links are public"
  on public.knife_attributes for select to anon, authenticated
  using (exists (
    select 1 from public.knives k
    where k.id = knife_attributes.knife_id and k.published
  ));

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger knives_set_updated_at before update on public.knives
for each row execute function public.set_updated_at();
create trigger attributes_set_updated_at before update on public.attributes
for each row execute function public.set_updated_at();

create or replace function public.get_public_atlas()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'knives', coalesce((select jsonb_agg(to_jsonb(k) - 'created_at' - 'updated_at' - 'published' order by k.sort_order) from public.knives k), '[]'::jsonb),
    'attributes', coalesce((select jsonb_agg(to_jsonb(a) - 'created_at' - 'updated_at' order by a.category, a.value) from public.attributes a), '[]'::jsonb),
    'links', coalesce((select jsonb_agg(jsonb_build_object('knife_id', ka.knife_id, 'attribute_key', ka.attribute_key)) from public.knife_attributes ka), '[]'::jsonb)
  );
$$;

revoke all on function public.get_public_atlas() from public;
grant execute on function public.get_public_atlas() to anon, authenticated;
grant select on public.knives, public.attributes, public.knife_attributes to anon, authenticated;
