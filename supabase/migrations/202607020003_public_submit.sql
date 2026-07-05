create or replace function public.submit_public_knife(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_knife_id text := coalesce(nullif(payload->>'id', ''), gen_random_uuid()::text);
  knife_name text := trim(coalesce(payload->>'name', ''));
  item jsonb;
  v_attribute_key text;
  tag_count integer := 0;
begin
  if knife_name = '' or length(knife_name) > 120 then
    raise exception 'name must contain 1 to 120 characters';
  end if;
  if length(coalesce(payload->>'description_zh', '')) > 5000
    or length(coalesce(payload->>'description_en', '')) > 5000 then
    raise exception 'description is too long';
  end if;
  if jsonb_typeof(coalesce(payload->'attributes', '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(payload->'attributes', '[]'::jsonb)) > 16 then
    raise exception 'attributes must be an array with at most 16 items';
  end if;

  insert into public.knives (
    id, sort_order, name, name_zh, name_en, year, designer, blade, weight,
    description_zh, description_en, sources, verified, verified_by, published
  ) values (
    v_knife_id, coalesce((payload->>'sort_order')::integer, 0), knife_name,
    coalesce(nullif(payload->>'name_zh', ''), knife_name),
    coalesce(nullif(payload->>'name_en', ''), knife_name),
    nullif(payload->>'year', '')::integer, left(coalesce(payload->>'designer', ''), 120),
    left(coalesce(payload->>'blade', ''), 80), left(coalesce(payload->>'weight', ''), 80),
    coalesce(payload->>'description_zh', ''), coalesce(payload->>'description_en', ''),
    case when jsonb_typeof(payload->'sources') = 'array' then payload->'sources' else '[]'::jsonb end,
    false, '[]'::jsonb, true
  );

  for item in select value from jsonb_array_elements(coalesce(payload->'attributes', '[]'::jsonb)) loop
    if item->>'category' not in ('brand', 'material', 'lock', 'tag', 'origin')
      or trim(coalesce(item->>'value', '')) = ''
      or length(item->>'value') > 120 then
      raise exception 'invalid attribute';
    end if;
    if item->>'category' = 'material' and coalesce(item->>'qualifier', '') not in ('blade', 'handle') then
      raise exception 'material qualifier must be blade or handle';
    end if;
    if item->>'category' = 'tag' then
      tag_count := tag_count + 1;
      if tag_count > 8 then raise exception 'at most 8 tags are allowed'; end if;
    end if;

    v_attribute_key := (item->>'category') || ':' ||
      case when coalesce(item->>'qualifier', '') <> '' then (item->>'qualifier') || ':' else '' end ||
      trim(item->>'value');

    insert into public.attributes (
      key, category, qualifier, value, name_zh, name_en,
      description_zh, description_en, sources, verified, verified_by
    ) values (
      v_attribute_key, item->>'category', coalesce(item->>'qualifier', ''), trim(item->>'value'),
      coalesce(nullif(item->>'name_zh', ''), trim(item->>'value')),
      coalesce(nullif(item->>'name_en', ''), trim(item->>'value')),
      '', '', '[]'::jsonb, false, '[]'::jsonb
    ) on conflict (key) do nothing;

    insert into public.knife_attributes(knife_id, attribute_key)
    values (v_knife_id, v_attribute_key);
  end loop;

  if not exists (select 1 from public.knife_attributes ka where ka.knife_id = v_knife_id and ka.attribute_key like 'brand:%')
    or not exists (select 1 from public.knife_attributes ka where ka.knife_id = v_knife_id and ka.attribute_key like 'origin:%') then
    raise exception 'brand and origin are required';
  end if;

  return v_knife_id;
end;
$$;

revoke all on function public.submit_public_knife(jsonb) from public;
grant execute on function public.submit_public_knife(jsonb) to anon, authenticated;
