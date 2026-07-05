import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectUrl = process.env.SUPABASE_URL || 'https://rvvxvdjxiknbglrgkidj.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) throw new Error('Set SUPABASE_SERVICE_ROLE_KEY. Do not use the publishable key.');

function parseMarkdown(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) throw new Error('Invalid Markdown frontmatter');
  const data = {};
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    try { data[key] = JSON.parse(value); } catch { data[key] = value; }
  }
  const section = language => match[2].match(new RegExp(`## ${language}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`))?.[1].trim() || '';
  return { ...data, description_zh: section('中文'), description_en: section('English') };
}

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith('.md') ? [path] : [];
  }))).flat();
}

async function api(path, { method = 'GET', body, prefer } = {}) {
  const response = await fetch(`${projectUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`);
}

const knifePaths = await markdownFiles(resolve('wiki/knives'));
const attributePaths = await markdownFiles(resolve('wiki/attributes'));
const knives = await Promise.all(knifePaths.map(async path => parseMarkdown(await readFile(path, 'utf8'))));
const attributes = await Promise.all(attributePaths.map(async path => parseMarkdown(await readFile(path, 'utf8'))));

const knifeRows = knives.map(knife => ({
  id: knife.id, sort_order: knife.order || 0, name: knife.name,
  name_zh: knife.name_zh || knife.name, name_en: knife.name_en || knife.name,
  year: knife.year || null, designer: knife.designer || '', blade: knife.blade || '', weight: knife.weight || '',
  description_zh: knife.description_zh, description_en: knife.description_en,
  sources: knife.sources || [], verified: Boolean(knife.verified), verified_by: knife.verified_by || [], published: true,
}));
const attributeRows = attributes.map(attribute => ({
  key: attribute.key, category: attribute.category, qualifier: attribute.qualifier || '', value: attribute.value,
  name_zh: attribute.name_zh || attribute.value, name_en: attribute.name_en || attribute.value,
  description_zh: attribute.description_zh, description_en: attribute.description_en,
  sources: attribute.sources || [], verified: Boolean(attribute.verified), verified_by: attribute.verified_by || [],
}));

await api('knives?on_conflict=id', { method: 'POST', body: knifeRows, prefer: 'resolution=merge-duplicates' });
await api('attributes?on_conflict=key', { method: 'POST', body: attributeRows, prefer: 'resolution=merge-duplicates' });

const links = [];
for (const knife of knives) {
  links.push({ knife_id: knife.id, attribute_key: `brand:${knife.brand}` });
  for (const material of knife.materials || []) links.push({ knife_id: knife.id, attribute_key: `material:${material.part}:${material.value}` });
  links.push({ knife_id: knife.id, attribute_key: `lock:${knife.lock}` });
  for (const tag of knife.tags || []) links.push({ knife_id: knife.id, attribute_key: `tag:${tag}` });
  links.push({ knife_id: knife.id, attribute_key: `origin:${knife.origin}` });
}
await api('knife_attributes?knife_id=not.is.null', { method: 'DELETE' });
await api('knife_attributes?on_conflict=knife_id,attribute_key', { method: 'POST', body: links, prefer: 'resolution=ignore-duplicates' });

console.log(`Imported ${knifeRows.length} knives, ${attributeRows.length} attributes and ${links.length} links.`);
