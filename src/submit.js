import './submit.css';

const projectUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rvvxvdjxiknbglrgkidj.supabase.co';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_YeeGg1KtTr2f9tYLhsDg5A_dJESK98I';
const form = document.querySelector('#knife-form');
const button = document.querySelector('#submit-button');
const status = document.querySelector('#status');

const values = text => text.split(/[,，]/).map(value => value.trim()).filter(Boolean);
const attribute = (category, value, qualifier = '') => value ? { category, qualifier, value } : null;
const brandSelect = form.elements.brand;
const otherBrandField = document.querySelector('#other-brand-field');
brandSelect.addEventListener('change', () => {
  otherBrandField.hidden = brandSelect.value !== '其他';
  form.elements.other_brand.required = brandSelect.value === '其他';
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  button.disabled = true;
  status.className = '';
  status.textContent = '正在提交…';

  const data = new FormData(form);
  const brand = data.get('brand') === '其他' ? data.get('other_brand').trim() : data.get('brand');
  const model = data.get('model').trim();
  const attributes = [
    attribute('brand', brand),
    attribute('origin', data.get('origin').trim() || '未知'),
    attribute('material', data.get('blade_material'), 'blade'),
    attribute('material', data.get('handle_material'), 'handle'),
    attribute('lock', data.get('lock')),
  ].filter(Boolean);
  const payload = {
    id: crypto.randomUUID(), name: `${brand} ${model}`, model,
    blade: data.get('blade_length_mm') ? `${data.get('blade_length_mm')} mm` : '',
    weight: data.get('weight_g') ? `${data.get('weight_g')} g` : '',
    description_zh: data.get('description_zh'), description_en: '',
    sources: values(data.get('sources')).filter(value => /^https?:\/\//i.test(value)).slice(0, 10), attributes,
    specs: {
      overall_length_mm: Number(data.get('overall_length_mm')) || null,
      blade_length_mm: Number(data.get('blade_length_mm')) || null,
      handle_length_mm: Number(data.get('handle_length_mm')) || null,
      handle_thickness_mm: Number(data.get('handle_thickness_mm')) || null,
      weight_g: Number(data.get('weight_g')) || null,
    },
  };

  try {
    const response = await fetch(`${projectUrl}/rest/v1/rpc/submit_public_knife`, {
      method: 'POST',
      headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || `HTTP ${response.status}`);
    form.reset();
    otherBrandField.hidden = true;
    form.elements.other_brand.required = false;
    status.className = 'success';
    status.textContent = '提交成功。刷新星图即可看到这条数据。';
  } catch (error) {
    status.className = 'error';
    status.textContent = `提交失败：${error.message}`;
  } finally { button.disabled = false; }
});
