import './admin.css';

const projectUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rvvxvdjxiknbglrgkidj.supabase.co';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_YeeGg1KtTr2f9tYLhsDg5A_dJESK98I';
const loginForm = document.querySelector('#login-form');
const uploadPanel = document.querySelector('#upload-panel');
const status = document.querySelector('#status');
const preview = document.querySelector('#preview');
const uploadButton = document.querySelector('#upload');
const fileInput = document.querySelector('#file');
let session = JSON.parse(sessionStorage.getItem('atlas-admin-session') || 'null');
let prepared = null;

function message(text, kind = '') {
  status.textContent = text;
  status.className = kind;
}

async function request(path, { method = 'GET', body, token = session?.access_token, prefer } = {}) {
  const response = await fetch(`${projectUrl}${path}`, {
    method,
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${token || publishableKey}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || `${response.status} ${response.statusText}`);
  return response.status === 204 ? null : response.json();
}

function showSession() {
  loginForm.hidden = Boolean(session);
  uploadPanel.hidden = !session;
  document.querySelector('#session-email').textContent = session?.user?.email || '';
}

function attributeKey(attribute) {
  return attribute.key || `${attribute.category}:${attribute.qualifier ? `${attribute.qualifier}:` : ''}${attribute.value}`;
}

function preparePayload(payload) {
  if (!Array.isArray(payload.knives) || !payload.knives.length) throw new Error('文件必须包含非空的 knives 数组');
  const attributes = new Map((payload.attributes || []).map(attribute => [attributeKey(attribute), attribute]));
  const links = [...(payload.links || [])];

  for (const knife of payload.knives) {
    if (!knife.id || !knife.name) throw new Error('每把刀必须包含 id 和 name');
    for (const attribute of knife.attributes || []) {
      const key = attributeKey(attribute);
      attributes.set(key, { ...attribute, key });
      links.push({ knife_id: knife.id, attribute_key: key });
    }
  }

  const knives = payload.knives.map((knife, index) => ({
    id: knife.id, sort_order: knife.sort_order ?? knife.order ?? index + 1,
    name: knife.name, name_zh: knife.name_zh || knife.name, name_en: knife.name_en || knife.name,
    year: knife.year || null, designer: knife.designer || '', blade: knife.blade || '', weight: knife.weight || '',
    description_zh: knife.description_zh || knife.description || '', description_en: knife.description_en || knife.descriptionEn || '',
    sources: knife.sources || [], verified: Boolean(knife.verified), verified_by: knife.verified_by || [],
    published: knife.published !== false,
  }));
  const attributeRows = [...attributes.values()].map(attribute => ({
    key: attributeKey(attribute), category: attribute.category, qualifier: attribute.qualifier || '', value: attribute.value,
    name_zh: attribute.name_zh || attribute.value, name_en: attribute.name_en || attribute.value,
    description_zh: attribute.description_zh || attribute.description || '',
    description_en: attribute.description_en || attribute.descriptionEn || '',
    sources: attribute.sources || [], verified: Boolean(attribute.verified), verified_by: attribute.verified_by || [],
  }));
  const validKeys = new Set(attributeRows.map(attribute => attribute.key));
  for (const link of links) {
    if (!link.knife_id || !validKeys.has(link.attribute_key)) throw new Error(`无效关系：${link.knife_id || '?'} → ${link.attribute_key || '?'}`);
  }
  return { knives, attributes: attributeRows, links };
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  message('正在登录…');
  try {
    session = await request('/auth/v1/token?grant_type=password', {
      method: 'POST', token: null,
      body: { email: document.querySelector('#email').value, password: document.querySelector('#password').value },
    });
    sessionStorage.setItem('atlas-admin-session', JSON.stringify(session));
    showSession();
    message('登录成功', 'success');
  } catch (error) { message(`登录失败：${error.message}`, 'error'); }
});

document.querySelector('#logout').addEventListener('click', () => {
  session = null; prepared = null;
  sessionStorage.removeItem('atlas-admin-session');
  showSession(); message('已退出');
});

fileInput.addEventListener('change', async () => {
  try {
    prepared = preparePayload(JSON.parse(await fileInput.files[0].text()));
    preview.textContent = `刀具 ${prepared.knives.length} 条\n属性 ${prepared.attributes.length} 条\n关系 ${prepared.links.length} 条`;
    uploadButton.disabled = false;
    message('结构检查通过', 'success');
  } catch (error) {
    prepared = null; uploadButton.disabled = true;
    preview.textContent = error.message; message(`文件无效：${error.message}`, 'error');
  }
});

uploadButton.addEventListener('click', async () => {
  uploadButton.disabled = true; message('正在写入 Supabase…');
  try {
    await request('/rest/v1/knives?on_conflict=id', { method: 'POST', body: prepared.knives, prefer: 'resolution=merge-duplicates' });
    await request('/rest/v1/attributes?on_conflict=key', { method: 'POST', body: prepared.attributes, prefer: 'resolution=merge-duplicates' });
    for (const knife of prepared.knives) await request(`/rest/v1/knife_attributes?knife_id=eq.${encodeURIComponent(knife.id)}`, { method: 'DELETE' });
    if (prepared.links.length) await request('/rest/v1/knife_attributes?on_conflict=knife_id,attribute_key', { method: 'POST', body: prepared.links, prefer: 'resolution=ignore-duplicates' });
    message(`上传完成：${prepared.knives.length} 把刀`, 'success');
  } catch (error) {
    message(`上传失败：${error.message}。请确认该账号已加入 admin_users。`, 'error');
  } finally { uploadButton.disabled = false; }
});

document.querySelector('#download-template').addEventListener('click', () => {
  const template = { knives: [{
    id: 'example-knife', name: 'Example Knife', name_zh: '示例刀具', name_en: 'Example Knife', year: 2026,
    designer: '', blade: '80 mm', weight: '90 g', description_zh: '', description_en: '', sources: [], published: true,
    attributes: [
      { category: 'brand', value: 'Example Brand', name_zh: '示例品牌', name_en: 'Example Brand' },
      { category: 'material', qualifier: 'blade', value: 'Example Steel' },
      { category: 'lock', value: 'Liner Lock' }, { category: 'tag', value: 'EDC' }, { category: 'origin', value: 'China' },
    ],
  }] };
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' }));
  link.download = 'knife-world-template.json'; link.click(); URL.revokeObjectURL(link.href);
});

showSession();
