import { mkdir, writeFile } from 'node:fs/promises';
import { KNIVES as SEED_KNIVES } from '../src/data.js';
import { englishDescriptions, valueFor } from '../src/i18n.js';
import { conceptExplanation, lockInfo, lockName } from '../src/concepts.js';

const root = new URL('../wiki/', import.meta.url);
const json = value => JSON.stringify(value ?? '');
const slug = value => String(value).normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
const frontmatter = fields => `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${json(value)}`).join('\n')}\n---`;

const handleMaterials = {
  'benchmade-940':'Aluminum', 'spyderco-pm2':'G-10', 'chris-reeve-sebenza':'Titanium', 'civivi-elementum':'G-10',
  'we-banter':'G-10', 'kizer-drop-bear':'Aluminum', 'quiet-carry-drift':'Titanium', 'giantmouse-ace-riv':'Micarta',
  'fox-radius':'Titanium', 'lionsteel-my-to':'Titanium', 'victorinox-climber':'Cellidor', 'opinel-no8':'Beech wood',
  'boker-barlow':'Micarta', 'mcusta-mc1':'Micarta', 'rockstead-higo':'Titanium', 'esee-izula':'Micarta',
  'morakniv-garberg':'Polyamide', 'demko-ad20':'G-10', 'spyderco-spydiechef':'Titanium', 'benchmade-bugout':'Grivory',
  'cold-steel-ad10':'G-10', 'sog-terminus-xr':'Carbon fiber / G-10', 'crkt-pilar-iii':'G-10',
  'sanrenmu-land-9103':'Stainless steel', 'maxace-black-mirror':'Titanium / Carbon fiber',
};
const extraTags = {
  'benchmade-940':['EDC','经典'], 'spyderco-pm2':['户外','EDC'], 'chris-reeve-sebenza':['绅士','EDC','收藏'],
  'civivi-elementum':['EDC','入门'], 'we-banter':['EDC','轻量'], 'kizer-drop-bear':['EDC','入门'],
  'quiet-carry-drift':['海事','EDC'], 'giantmouse-ace-riv':['EDC','绅士'], 'fox-radius':['收藏','机械'],
  'lionsteel-my-to':['户外','EDC'], 'victorinox-climber':['多功能','经典'], 'opinel-no8':['传统','经典'],
  'boker-barlow':['传统','绅士'], 'mcusta-mc1':['绅士','收藏'], 'rockstead-higo':['收藏','高端'],
  'esee-izula':['生存','户外'], 'morakniv-garberg':['生存','户外'], 'demko-ad20':['战术','EDC'],
  'spyderco-spydiechef':['海事','EDC'], 'benchmade-bugout':['户外','EDC','轻量'], 'cold-steel-ad10':['战术','户外'],
  'sog-terminus-xr':['EDC','战术'], 'crkt-pilar-iii':['EDC','入门'], 'sanrenmu-land-9103':['户外','入门'],
  'maxace-black-mirror':['收藏','高端'],
};
const knifeSources = {
  'benchmade-940':['https://www.gearblog.cn/archives/23691'],
  'spyderco-spydiechef':['https://www.gearblog.cn/archives/48068'],
};
const brandNames = {
  '三刃木':{ zh:'三刃木', en:'Sanrenmu' },
};

const KNIVES = SEED_KNIVES.map(knife => ({
  ...knife,
  materials:[{ part:'blade', value:knife.steel }, { part:'handle', value:handleMaterials[knife.id] || 'Unknown' }],
  tags:extraTags[knife.id] || [knife.style],
  sources:knifeSources[knife.id] || [], verified:false, verified_by:[],
}));

await mkdir(new URL('knives/', root), { recursive: true });
await mkdir(new URL('attributes/', root), { recursive: true });

for (const [index, knife] of KNIVES.entries()) {
  const markdown = `${frontmatter({ kind:'knife', order:index + 1, id:knife.id, name:knife.name, name_zh:knife.name, name_en:knife.name, brand:knife.brand, materials:knife.materials, lock:knife.lock, tags:knife.tags, origin:knife.origin, year:knife.year, designer:knife.designer, blade:knife.blade, weight:knife.weight, sources:knife.sources, verified:knife.verified, verified_by:knife.verified_by })}\n\n# ${knife.name}\n\n## 中文\n${knife.description}\n\n## English\n${englishDescriptions[knife.id] || knife.description}\n`;
  await writeFile(new URL(`knives/${knife.id}.md`, root), markdown);
}

const facets = [];
for (const knife of KNIVES) {
  facets.push({ category:'brand', value:knife.brand });
  knife.materials.forEach(material => facets.push({ category:'material', value:material.value, qualifier:material.part }));
  facets.push({ category:'lock', value:knife.lock });
  knife.tags.forEach(tag => facets.push({ category:'tag', value:tag }));
  facets.push({ category:'origin', value:knife.origin });
}
const uniqueFacets = new Map();
facets.forEach(facet => uniqueFacets.set(`${facet.category}:${facet.qualifier ? `${facet.qualifier}:` : ''}${facet.value}`, facet));

function localizedNames(facet) {
  if (facet.category === 'brand') return brandNames[facet.value] || { zh:facet.value, en:facet.value };
  if (facet.category === 'lock') return { zh:lockName(facet.value, 'zh'), en:lockName(facet.value, 'en') };
  if (facet.category === 'tag' || facet.category === 'origin') return { zh:valueFor(facet.value, 'zh'), en:valueFor(facet.value, 'en') };
  return { zh:facet.value, en:facet.value };
}

for (const facet of uniqueFacets.values()) {
  const directory = new URL(`attributes/${facet.category}/`, root); await mkdir(directory, { recursive:true });
  const key = `${facet.category}:${facet.qualifier ? `${facet.qualifier}:` : ''}${facet.value}`;
  const count = facets.filter(item => item.category === facet.category && item.value === facet.value && item.qualifier === facet.qualifier).length;
  const names = localizedNames(facet);
  const sources = facet.category === 'lock' && lockInfo(facet.value, 'zh')?.source ? [lockInfo(facet.value, 'zh').source] : [];
  const node = { ...facet, label:facet.value };
  const markdown = `${frontmatter({ kind:'attribute', key, category:facet.category, qualifier:facet.qualifier || '', value:facet.value, name_zh:names.zh, name_en:names.en, sources, verified:false, verified_by:[] })}\n\n# ${names.zh}\n\n## 中文\n${conceptExplanation(node, 'zh', count)}\n\n## English\n${conceptExplanation(node, 'en', count)}\n`;
  const filename = `${facet.qualifier ? `${facet.qualifier}-` : ''}${slug(facet.value)}.md`;
  await writeFile(new URL(`attributes/${facet.category}/${filename}`, root), markdown);
}

const readme = `# Knife World Wiki\n\n本目录是网站唯一的内容源。每把刀和每个属性都是独立 Markdown，适合通过 Pull Request 补充或校正。\n\n- \`knives/\`：每把刀一份文档；\`materials\` 与 \`tags\` 均为数组。\n- \`attributes/brand/\`：品牌。\n- \`attributes/material/\`：刀刃与刀柄材质。\n- \`attributes/lock/\`：锁定结构。\n- \`attributes/tag/\`：可多选标签。\n- \`attributes/origin/\`：制造地区。\n\n每份文档必须保留 \`sources\`、\`verified\`、\`verified_by\` 字段，以及“中文”和“English”二级标题。没有来源或刀友认证时请保留空数组与 \`false\`，页面会自动显示待完善标记。修改合并到主分支后，GitHub Actions 会自动重新构建并发布 GitHub Pages。\n`;
await writeFile(new URL('README.md', root), readme);
console.log(`Generated ${KNIVES.length} knife pages and ${uniqueFacets.size} attribute pages in wiki/.`);
