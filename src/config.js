export const CONFIG = {
  brand: {
    eyebrow: 'INTERACTIVE KNIFE ATLAS · 2026',
    title: 'KNIFE WORLD',
    subtitle: '刃之星图',
  },
  scene: {
    background: '#05070b',
    fog: '#05070b',
    fogNear: 48,
    fogFar: 120,
    camera: { fov: 48, near: 0.1, far: 240, position: [0, 8, 42] },
    pixelRatioMax: 1.75,
    autoRotateSpeed: 0.16,
    starCount: 3200,
    starRadius: 68,
    nebulaFlowSpeed: 0.075,
    mouseGravity: 0.052,
  },
  layout: {
    iterations: 150,
    linkStrength: 0.016,
    repulsion: 0.052,
    centerPull: 0.0028,
    attributeRadius: 18,
    depth: 13,
    seed: 24,
  },
  nodes: {
    knifeSize: 0.74,
    attributeSize: 0.48,
    selectedScale: 1.22,
    hoverScale: 1.18,
    dimOpacity: 0.08,
  },
  colors: {
    knife: '#f3f0e8',
    brand: '#ffb84d',
    material: '#67d6ff',
    lock: '#c58aff',
    tag: '#ff6b8b',
    origin: '#69e6aa',
    edge: '#aab9c7',
    selected: '#ffffff',
  },
  labels: {
    brand: '品牌', material: '材质', lock: '锁定', tag: '标签', origin: '产地', knife: '刀具',
  },
  performance: {
    sphereSegments: 16,
    sphereRings: 10,
    hoverThrottleMs: 40,
  },
};

export const FILTERS = [
  { key: 'all', label: '全部星体' },
  { key: 'knife', label: '小刀' },
  { key: 'brand', label: '品牌' },
  { key: 'material', label: '材质' },
  { key: 'lock', label: '锁定' },
  { key: 'tag', label: '标签' },
];
