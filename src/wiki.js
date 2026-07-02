const knifeFiles = import.meta.glob('../wiki/knives/*.md', { query: '?raw', import: 'default', eager: true });
const attributeFiles = import.meta.glob('../wiki/attributes/**/*.md', { query: '?raw', import: 'default', eager: true });

function parseMarkdown(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return null;
  const data = {};
  match[1].split('\n').forEach(line => {
    const separator = line.indexOf(':'); if (separator < 0) return;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    try { data[key] = JSON.parse(value); } catch { data[key] = value; }
  });
  const section = language => {
    const sectionMatch = match[2].match(new RegExp(`## ${language}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`));
    return sectionMatch?.[1].trim() || '';
  };
  return { ...data, description: section('中文'), descriptionEn: section('English') };
}

export const KNIVES = Object.values(knifeFiles).map(parseMarkdown).filter(Boolean).sort((a, b) => (a.order || 0) - (b.order || 0));
export const ATTRIBUTE_ENTRIES = new Map(
  Object.values(attributeFiles).map(parseMarkdown).filter(Boolean).map(entry => [entry.key || `${entry.category}:${entry.value}`, entry]),
);

export const ATTRIBUTE_META = {
  brand: { title: '品牌谱系', description: '制造者决定了一把刀的设计语言、工艺传统与价值取向。' },
  material: { title: '材质体系', description: '刀刃与刀柄材质共同决定切割性能、结构强度、触感与重量。' },
  lock: { title: '锁定结构', description: '锁定方式塑造操作手感，也决定承力路径和使用边界。' },
  tag: { title: '使用标签', description: '标签可以并存，用来描述一把刀的用途、气质与设计倾向。' },
  origin: { title: '制造原点', description: '地域连接材料、制造传统与独特的审美气质。' },
};
