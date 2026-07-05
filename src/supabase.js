const projectUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rvvxvdjxiknbglrgkidj.supabase.co';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_YeeGg1KtTr2f9tYLhsDg5A_dJESK98I';

function asKnife(row, linksByKnife, attributesByKey) {
  const linked = (linksByKnife.get(row.id) || []).map(key => attributesByKey.get(key)).filter(Boolean);
  const one = category => linked.find(attribute => attribute.category === category)?.value || '';

  return {
    id: row.id,
    order: row.sort_order,
    name: row.name,
    name_zh: row.name_zh,
    name_en: row.name_en,
    brand: one('brand'),
    materials: linked.filter(attribute => attribute.category === 'material').map(attribute => ({
      part: attribute.qualifier,
      value: attribute.value,
    })),
    lock: one('lock'),
    tags: linked.filter(attribute => attribute.category === 'tag').map(attribute => attribute.value),
    origin: one('origin'),
    year: row.year,
    designer: row.designer,
    blade: row.blade,
    weight: row.weight,
    model: row.model || '',
    specs: row.specs || {},
    description: row.description_zh,
    descriptionEn: row.description_en,
    sources: row.sources || [],
    verified: row.verified,
    verified_by: row.verified_by || [],
  };
}

export async function fetchRemoteWiki({ timeout = 4500 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${projectUrl}/rest/v1/rpc/get_public_atlas`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.knives) || !payload.knives.length) return null;

    const attributes = (payload.attributes || []).map(row => ({
      key: row.key,
      category: row.category,
      qualifier: row.qualifier || '',
      value: row.value,
      name_zh: row.name_zh,
      name_en: row.name_en,
      description: row.description_zh,
      descriptionEn: row.description_en,
      sources: row.sources || [],
      verified: row.verified,
      verified_by: row.verified_by || [],
    }));
    const attributesByKey = new Map(attributes.map(attribute => [attribute.key, attribute]));
    const linksByKnife = new Map();
    for (const link of payload.links || []) {
      if (!linksByKnife.has(link.knife_id)) linksByKnife.set(link.knife_id, []);
      linksByKnife.get(link.knife_id).push(link.attribute_key);
    }

    return {
      knives: payload.knives.map(row => asKnife(row, linksByKnife, attributesByKey)),
      attributes,
    };
  } finally {
    clearTimeout(timer);
  }
}
