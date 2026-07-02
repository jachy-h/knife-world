import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG, FILTERS } from './config.js';
import { KNIVES, ATTRIBUTE_META, ATTRIBUTE_ENTRIES } from './wiki.js';
import { messages, englishDescriptions, valueFor } from './i18n.js';
import { conceptExplanation, lockDiagram } from './concepts.js';
import './style.css';

const app = document.querySelector('#app');
let locale = localStorage.getItem('knife-world-locale') || 'zh';
const msg = () => messages[locale];
document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
app.innerHTML = `
  <canvas id="universe" aria-label="小刀关系三维星图"></canvas>
  <div class="grain" aria-hidden="true"></div>
  <header class="topbar">
    <a class="identity" href="#" aria-label="小刀世界首页">
      <span class="mark"><i></i></span>
      <span><b>${CONFIG.brand.title}</b><em>${CONFIG.brand.subtitle}</em></span>
    </a>
    <div class="atlas-index"><span>ATLAS INDEX</span><strong>${String(KNIVES.length).padStart(3, '0')}</strong></div>
    <div class="header-actions"><button class="language-button" data-action="locale">${locale === 'zh' ? '中文' : 'EN'}</button><button class="about-button" data-action="about"><span class="about-label">${msg().about}</span> <span>↗</span></button></div>
  </header>

  <section class="hero-copy">
    <p class="eyebrow">${msg().eyebrow}</p>
    <h1 id="hero-title">${msg().hero}</h1>
    <p class="lede" id="hero-lede">${msg().lede}</p>
  </section>

  <section class="search-panel" aria-label="搜索与筛选">
    <label class="search-box">
      <span>⌕</span>
      <input id="search" autocomplete="off" placeholder="${msg().search}" />
      <kbd>/</kbd>
    </label>
    <div id="search-results" class="search-results"></div>
    <nav id="filters" class="filters"></nav>
  </section>

  <aside class="legend">
    <p>${msg().spectrum}</p>
    <div id="legend-items"></div>
  </aside>

  <div class="hint"><span class="mouse-icon"></span><span id="hint-label">${msg().hint}</span></div>
  <div id="tooltip" class="tooltip"></div>
  <div id="node-labels" class="node-labels" aria-hidden="true"></div>
  <aside id="detail" class="detail" aria-live="polite"></aside>
  <div class="coordinates"><span id="fps">60 FPS</span><span>WEBGL · INSTANCED</span></div>
`;

const labelLayer = document.querySelector('#node-labels');
let visibleLabelNodes = [];
let visibleLabelElements = [];

const categoryKeys = ['brand', 'material', 'lock', 'tag', 'origin'];
const nodes = [];
const links = [];
const attributes = new Map();

function facetsFor(knife, category) {
  if (category === 'material') return (knife.materials || []).map(material => ({ value:material.value, qualifier:material.part }));
  if (category === 'tag') return (knife.tags || []).map(value => ({ value }));
  return [{ value:knife[category] }];
}
function facetKey(category, value, qualifier = '') { return `${category}:${qualifier ? `${qualifier}:` : ''}${value}`; }

for (const knife of KNIVES) {
  const knifeNode = { ...knife, type: 'knife', category: 'knife', label: knife.name, key: knife.id, attributeKeys:[] };
  nodes.push(knifeNode);
  for (const category of categoryKeys) {
    for (const facet of facetsFor(knife, category)) {
      const key = facetKey(category, facet.value, facet.qualifier);
      if (!attributes.has(key)) {
        const wikiEntry = ATTRIBUTE_ENTRIES.get(key);
        attributes.set(key, {
          key, label: facet.value, qualifier:facet.qualifier || '', type:'attribute', category,
          name_zh:wikiEntry?.name_zh || facet.value, name_en:wikiEntry?.name_en || facet.value,
          knives:[], description:wikiEntry?.description || ATTRIBUTE_META[category].description,
          descriptionEn:wikiEntry?.descriptionEn || '', sources:wikiEntry?.sources || [],
          verified:Boolean(wikiEntry?.verified), verified_by:wikiEntry?.verified_by || [],
        });
      }
      attributes.get(key).knives.push(knife.id);
      knifeNode.attributeKeys.push(key);
      links.push({ source:knife.id, target:key, category, qualifier:facet.qualifier || '' });
    }
  }
}
nodes.push(...attributes.values());

const nodeByKey = new Map(nodes.map((node, index) => [node.key, { node, index }]));
const adjacency = new Map(nodes.map(node => [node.key, new Set()]));
links.forEach(link => { adjacency.get(link.source)?.add(link.target); adjacency.get(link.target)?.add(link.source); });
const seeded = (() => { let s = CONFIG.layout.seed; return () => ((s = Math.imul(48271, s) % 2147483647) & 2147483647) / 2147483647; })();
const categoryAngles = new Map(categoryKeys.map((key, i) => [key, (i / categoryKeys.length) * Math.PI * 2 - Math.PI / 2]));

// Shared attributes pull knives into naturally related neighborhoods.
for (const node of nodes) {
  if (node.type === 'attribute') {
    const base = categoryAngles.get(node.category);
    const sameCategory = [...attributes.values()].filter(n => n.category === node.category);
    const rank = sameCategory.findIndex(n => n.key === node.key);
    const spread = (rank - (sameCategory.length - 1) / 2) * 0.09;
    const radius = CONFIG.layout.attributeRadius + (seeded() - .5) * 8;
    node.position = new THREE.Vector3(
      Math.cos(base + spread) * radius,
      (seeded() - .5) * CONFIG.layout.depth,
      Math.sin(base + spread) * radius
    );
  }
}
for (const node of nodes) {
  if (node.type === 'knife') {
    const center = new THREE.Vector3();
    node.attributeKeys.forEach(key => center.add(nodeByKey.get(key).node.position));
    center.multiplyScalar(1 / Math.max(1, node.attributeKeys.length));
    center.x += (seeded() - .5) * 5;
    center.y += (seeded() - .5) * 7;
    center.z += (seeded() - .5) * 5;
    node.position = center;
  }
}

const canvas = document.querySelector('#universe');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, CONFIG.scene.pixelRatioMax));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.scene.background);
scene.fog = new THREE.Fog(CONFIG.scene.fog, CONFIG.scene.fogNear, CONFIG.scene.fogFar);

const camera = new THREE.PerspectiveCamera(CONFIG.scene.camera.fov, innerWidth / innerHeight, CONFIG.scene.camera.near, CONFIG.scene.camera.far);
camera.position.fromArray(CONFIG.scene.camera.position);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = .045;
controls.minDistance = 12;
controls.maxDistance = 75;
controls.autoRotate = true;
controls.autoRotateSpeed = CONFIG.scene.autoRotateSpeed;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0x839bb4, 1.35));
const keyLight = new THREE.PointLight(0xffffff, 38, 60); keyLight.position.set(2, 10, 14); scene.add(keyLight);
const blueLight = new THREE.PointLight(0x3aaee8, 24, 45); blueLight.position.set(-17, -6, 2); scene.add(blueLight);

const sphereGeometry = new THREE.IcosahedronGeometry(1, 2);
const kindIndex = { knife:0, brand:1, material:2, lock:3, tag:4, origin:5 };
sphereGeometry.setAttribute('aKind', new THREE.InstancedBufferAttribute(new Float32Array(nodes.map(n => kindIndex[n.category])), 1));
sphereGeometry.setAttribute('aNodeColor', new THREE.InstancedBufferAttribute(new Float32Array(nodes.flatMap(n => new THREE.Color(CONFIG.colors[n.category]).toArray())), 3));
const sphereMaterial = new THREE.ShaderMaterial({
  uniforms: { uTime:{ value:0 } },
  vertexShader: `
    attribute float aKind; attribute vec3 aNodeColor;
    varying vec3 vNormal; varying vec3 vLocal; varying vec3 vColor; varying float vKind; varying vec3 vView;
    void main(){
      vKind=aKind; vColor=aNodeColor; vLocal=position;
      vec4 mv=modelViewMatrix*instanceMatrix*vec4(position,1.);
      vNormal=normalize(normalMatrix*mat3(instanceMatrix)*normal); vView=-mv.xyz;
      gl_Position=projectionMatrix*mv;
    }`,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vNormal; varying vec3 vLocal; varying vec3 vColor; varying float vKind; varying vec3 vView;
    void main(){
      vec3 n=normalize(vNormal); vec3 viewDir=normalize(vView);
      float diffuse=.28+.72*max(dot(n,normalize(vec3(.45,.8,.65))),0.);
      float fresnel=pow(1.-max(dot(n,viewDir),0.),2.2);
      float pattern=0.; float emission=.35;
      if(vKind<.5){ pattern=step(.86,fract((vLocal.x-vLocal.y+vLocal.z)*5.)); emission=.18; }
      else if(vKind<1.5){ pattern=.5+.5*sin(vLocal.y*13.+sin(vLocal.x*9.)+uTime*1.6); emission=.72+.12*sin(uTime*2.); }
      else if(vKind<2.5){ pattern=pow(abs(dot(n,normalize(vec3(.7,-.2,.65)))),7.); emission=.5; }
      else if(vKind<3.5){ float ring=length(vLocal.xz); pattern=smoothstep(.72,.92,sin(ring*18.)*.5+.5); emission=.62; }
      else if(vKind<4.5){ pattern=.5+.5*sin((vLocal.x+vLocal.y)*6.+uTime*.35); emission=.48; }
      else { pattern=step(.82,.5+.5*sin(atan(vLocal.z,vLocal.x)*9.))*0.55; emission=.55; }
      vec3 color=vColor*(diffuse+emission*.48)+vColor*fresnel*(.85+emission)+vec3(pattern*.15);
      if(vKind<.5) color=mix(color,vec3(.96,.98,1.),.22+pattern*.2);
      gl_FragColor=vec4(color,1.);
    }`,
});
const nodeMesh = new THREE.InstancedMesh(sphereGeometry, sphereMaterial, nodes.length);
nodeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
nodeMesh.userData.nodes = nodes;
scene.add(nodeMesh);

const glowGeometry = new THREE.BufferGeometry();
glowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodes.flatMap(n => n.position.toArray()), 3));
glowGeometry.setAttribute('aColor', new THREE.Float32BufferAttribute(nodes.flatMap(n => new THREE.Color(CONFIG.colors[n.category]).toArray()), 3));
glowGeometry.setAttribute('aSize', new THREE.Float32BufferAttribute(nodes.map(n => n.type === 'knife' ? 52 : 38), 1));
const glowMaterial = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uPixelRatio: { value: renderer.getPixelRatio() }, uGlowSize: { value: 1 }, uOpacity: { value: .92 } },
  vertexShader: `uniform float uPixelRatio; uniform float uGlowSize; attribute vec3 aColor; attribute float aSize; varying vec3 vColor; void main(){ vColor=aColor; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=aSize*uGlowSize*uPixelRatio*(20./-mv.z); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform float uOpacity; varying vec3 vColor; void main(){ float d=distance(gl_PointCoord,vec2(.5)); float core=smoothstep(.5,.02,d); float halo=pow(max(0.,1.-d*2.),1.35); gl_FragColor=vec4(vColor,(core*.12+halo*.88)*uOpacity); }`,
});
const glows = new THREE.Points(glowGeometry, glowMaterial); scene.add(glows);
const outerGlowMaterial = glowMaterial.clone();
outerGlowMaterial.uniforms.uGlowSize.value = 2.7;
outerGlowMaterial.uniforms.uOpacity.value = .46;
const outerGlows = new THREE.Points(glowGeometry, outerGlowMaterial); scene.add(outerGlows);

const ARC_SEGMENTS = 12;
const FLOW_PARTICLES_PER_LINK = 3;
const linePositions = [];
const lineColors = [];
const arcScratchA = new THREE.Vector3(), arcScratchB = new THREE.Vector3();
function pointOnArc(link, t, target) {
  const inv = 1 - t;
  return target.set(
    inv * inv * link.arcA.x + 2 * inv * t * link.arcControl.x + t * t * link.arcB.x,
    inv * inv * link.arcA.y + 2 * inv * t * link.arcControl.y + t * t * link.arcB.y,
    inv * inv * link.arcA.z + 2 * inv * t * link.arcControl.z + t * t * link.arcB.z,
  );
}
links.forEach((link, linkIndex) => {
  link.arcA = nodeByKey.get(link.source).node.position;
  link.arcB = nodeByKey.get(link.target).node.position;
  const delta = link.arcB.clone().sub(link.arcA);
  const perpendicular = delta.clone().cross(new THREE.Vector3(0, 1, 0));
  if (perpendicular.lengthSq() < .001) perpendicular.crossVectors(delta, new THREE.Vector3(1, 0, 0));
  perpendicular.normalize().multiplyScalar(Math.min(4.8, Math.max(1.15, delta.length() * .16)) * (linkIndex % 2 ? 1 : -1));
  link.arcControl = link.arcA.clone().add(link.arcB).multiplyScalar(.5).add(perpendicular);
  link.arcControl.y += Math.min(3.8, 1 + delta.length() * .1);
  const base = new THREE.Color(CONFIG.colors[link.category]);
  for (let segment = 0; segment < ARC_SEGMENTS; segment++) {
    const t0 = segment / ARC_SEGMENTS, t1 = (segment + 1) / ARC_SEGMENTS;
    pointOnArc(link, t0, arcScratchA); pointOnArc(link, t1, arcScratchB);
    linePositions.push(...arcScratchA.toArray(), ...arcScratchB.toArray());
    const c0 = base.clone().lerp(new THREE.Color('#dff8ff'), Math.sin(t0 * Math.PI) * .16);
    const c1 = base.clone().lerp(new THREE.Color('#dff8ff'), Math.sin(t1 * Math.PI) * .16);
    lineColors.push(...c0.toArray(), ...c1.toArray());
  }
});
const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
const lineMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .14, blending: THREE.AdditiveBlending, depthWrite: false });
const linkLines = new THREE.LineSegments(lineGeometry, lineMaterial); scene.add(linkLines);

// A separate additive layer makes selected relationships read like active light paths.
const highlightGeometry = new THREE.BufferGeometry();
highlightGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(links.length * ARC_SEGMENTS * 6), 3));
highlightGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(links.length * ARC_SEGMENTS * 6), 3));
highlightGeometry.setDrawRange(0, 0);
const highlightMaterial = new THREE.LineBasicMaterial({ vertexColors:true, transparent:true, opacity:.92, blending:THREE.AdditiveBlending, depthWrite:false });
const highlightLines = new THREE.LineSegments(highlightGeometry, highlightMaterial); scene.add(highlightLines);
const highlightAuraMaterial = highlightMaterial.clone(); highlightAuraMaterial.opacity = .28;
const highlightAura = new THREE.LineSegments(highlightGeometry, highlightAuraMaterial); scene.add(highlightAura);

const flowGeometry = new THREE.BufferGeometry();
flowGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(links.length * FLOW_PARTICLES_PER_LINK * 3), 3));
flowGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(links.length * FLOW_PARTICLES_PER_LINK * 3), 3));
flowGeometry.setDrawRange(0, 0);
const flowMaterial = new THREE.PointsMaterial({ size:.24, vertexColors:true, transparent:true, opacity:.95, blending:THREE.AdditiveBlending, depthWrite:false, sizeAttenuation:true });
const flowPoints = new THREE.Points(flowGeometry, flowMaterial); scene.add(flowPoints);
const flowAuraMaterial = flowMaterial.clone(); flowAuraMaterial.size = .62; flowAuraMaterial.opacity = .24;
const flowAura = new THREE.Points(flowGeometry, flowAuraMaterial); scene.add(flowAura);
let activeHighlightLinks = [];

// GPU-driven spiral nebula: particles drift continuously and bend toward the pointer in screen space.
const starGeometry = new THREE.BufferGeometry();
const starPositions = [], starColors = [], starSeeds = [], starSizes = [];
const nebulaBlue = new THREE.Color('#4cbcff'), nebulaViolet = new THREE.Color('#8e5cff'), nebulaIce = new THREE.Color('#b9eaff');
for (let i = 0; i < CONFIG.scene.starCount; i++) {
  const arm = i % 4;
  const radius = 9 + Math.pow(seeded(), .58) * CONFIG.scene.starRadius;
  const angle = arm * Math.PI * .5 + radius * .105 + (seeded() - .5) * 1.12;
  const spread = (seeded() - .5) * (4 + radius * .045);
  starPositions.push(Math.cos(angle) * radius + spread, (seeded() - .5) * (5 + radius * .11), Math.sin(angle) * radius + spread);
  const mix = seeded();
  const color = (mix < .55 ? nebulaBlue.clone().lerp(nebulaViolet, mix * 1.7) : nebulaViolet.clone().lerp(nebulaIce, (mix - .55) * 2.2));
  const sizeSeed = seeded();
  starColors.push(color.r, color.g, color.b); starSeeds.push(seeded()); starSizes.push(.75 + Math.pow(sizeSeed, 3.2) * 7.5);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
starGeometry.setAttribute('aColor', new THREE.Float32BufferAttribute(starColors, 3));
starGeometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(starSeeds, 1));
starGeometry.setAttribute('aSize', new THREE.Float32BufferAttribute(starSizes, 1));
const starMaterial = new THREE.ShaderMaterial({
  transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
  uniforms:{ uTime:{value:0}, uPixelRatio:{value:renderer.getPixelRatio()}, uMouse:{value:new THREE.Vector2()}, uGravity:{value:CONFIG.scene.mouseGravity}, uDensity:{value:.78} },
  vertexShader:`
    uniform float uTime; uniform float uPixelRatio; uniform vec2 uMouse; uniform float uGravity;
    attribute vec3 aColor; attribute float aSeed; attribute float aSize;
    varying vec3 vColor; varying float vSeed; varying float vDepth;
    void main(){
      vec3 p=position; float t=uTime;
      p.x+=sin(p.z*.075+t+aSeed*6.28)*1.15; p.y+=sin(p.x*.09-t*.72+aSeed*4.)*.8; p.z+=cos(p.x*.06+t*.63)*1.05;
      vec4 mv=modelViewMatrix*vec4(p,1.); vec4 clip=projectionMatrix*mv;
      vec2 ndc=clip.xy/clip.w; vec2 pull=uMouse-ndc; float influence=smoothstep(1.05,.03,length(pull));
      clip.xy+=pull*influence*uGravity*clip.w;
      gl_Position=clip; gl_PointSize=aSize*uPixelRatio*(76./max(8.,-mv.z));
      vColor=aColor; vSeed=aSeed; vDepth=smoothstep(120.,12.,-mv.z);
    }`,
  fragmentShader:`
    uniform float uDensity; varying vec3 vColor; varying float vSeed; varying float vDepth;
    void main(){ if(vSeed>uDensity) discard; float d=distance(gl_PointCoord,vec2(.5)); float glow=pow(max(0.,1.-d*2.),1.85); if(d>.5) discard; gl_FragColor=vec4(vColor,glow*(.28+.72*vDepth)*.86); }`,
});
const nebula = new THREE.Points(starGeometry, starMaterial); nebula.rotation.x = -.08; scene.add(nebula);
const nebulaMouse = new THREE.Vector2(), nebulaMouseTarget = new THREE.Vector2();
let densityTarget = .78;

const dummy = new THREE.Object3D();
function refreshNodes(selected = null, hovered = null, filter = 'all') {
  let relationDepth = null;
  if (selected && adjacency.has(selected.key)) {
    relationDepth = new Map([[selected.key, 0]]);
    let frontier = [selected.key];
    for (let depth = 1; depth <= 2; depth++) {
      const next = [];
      frontier.forEach(key => adjacency.get(key)?.forEach(neighbor => {
        if (!relationDepth.has(neighbor)) { relationDepth.set(neighbor, depth); next.push(neighbor); }
      }));
      frontier = next;
    }
  }
  nodes.forEach((node, i) => {
    const activeFilter = filter === 'all' || node.category === filter || node.type === filter;
    const depth = relationDepth?.get(node.key);
    const activeRelation = !relationDepth || depth !== undefined;
    let scale = node.type === 'knife' ? CONFIG.nodes.knifeSize : CONFIG.nodes.attributeSize;
    if (node === selected) scale *= CONFIG.nodes.selectedScale;
    else if (node === hovered) scale *= CONFIG.nodes.hoverScale;
    else if (depth === 2) scale *= .78;
    if (!activeFilter || !activeRelation) scale *= .3;
    dummy.position.copy(node.position); dummy.scale.setScalar(scale); dummy.updateMatrix(); nodeMesh.setMatrixAt(i, dummy.matrix);
    const base = new THREE.Color(CONFIG.colors[node.category]);
    if (!activeFilter || !activeRelation) base.multiplyScalar(.035);
    else if (depth === 2) base.multiplyScalar(.48);
    sphereGeometry.attributes.aNodeColor.setXYZ(i, base.r, base.g, base.b);
    glowGeometry.attributes.aColor.setXYZ(i, base.r, base.g, base.b);
  });
  nodeMesh.instanceMatrix.needsUpdate = true;
  sphereGeometry.attributes.aNodeColor.needsUpdate = true;
  glowGeometry.attributes.aColor.needsUpdate = true;
  links.forEach((link, i) => {
    const sourceDepth = relationDepth?.get(link.source), targetDepth = relationDepth?.get(link.target);
    const direct = !relationDepth || sourceDepth === 0 || targetDepth === 0;
    const withinRelation = !relationDepth || (sourceDepth !== undefined && targetDepth !== undefined);
    const intensity = direct ? 1 : (withinRelation ? .3 : .025);
    const color = new THREE.Color(CONFIG.colors[link.category]).multiplyScalar(intensity);
    for (let segment = 0; segment < ARC_SEGMENTS; segment++) {
      const vertex = (i * ARC_SEGMENTS + segment) * 2;
      const shimmer = .82 + Math.sin((segment / ARC_SEGMENTS) * Math.PI) * .32;
      lineGeometry.attributes.color.setXYZ(vertex, color.r * shimmer, color.g * shimmer, color.b * shimmer);
      lineGeometry.attributes.color.setXYZ(vertex + 1, color.r * shimmer, color.g * shimmer, color.b * shimmer);
    }
  });
  lineGeometry.attributes.color.needsUpdate = true;
  lineMaterial.opacity = selected ? .26 : .14;

  activeHighlightLinks = relationDepth ? links.filter(link => relationDepth.has(link.source) && relationDepth.has(link.target)) : [];
  const hiPos = highlightGeometry.attributes.position, hiColor = highlightGeometry.attributes.color, flowColor = flowGeometry.attributes.color;
  activeHighlightLinks.forEach((link, i) => {
    const direct = relationDepth.get(link.source) === 0 || relationDepth.get(link.target) === 0;
    const baseColor = new THREE.Color(CONFIG.colors[link.category]).multiplyScalar(direct ? 1.7 : .76);
    for (let segment = 0; segment < ARC_SEGMENTS; segment++) {
      const t0 = segment / ARC_SEGMENTS, t1 = (segment + 1) / ARC_SEGMENTS;
      pointOnArc(link, t0, arcScratchA); pointOnArc(link, t1, arcScratchB);
      const vertex = (i * ARC_SEGMENTS + segment) * 2;
      hiPos.setXYZ(vertex, arcScratchA.x, arcScratchA.y, arcScratchA.z); hiPos.setXYZ(vertex + 1, arcScratchB.x, arcScratchB.y, arcScratchB.z);
      const glow = .9 + Math.sin(t0 * Math.PI) * .55;
      hiColor.setXYZ(vertex, baseColor.r * glow, baseColor.g * glow, baseColor.b * glow);
      hiColor.setXYZ(vertex + 1, baseColor.r * glow, baseColor.g * glow, baseColor.b * glow);
    }
    for (let pulse = 0; pulse < FLOW_PARTICLES_PER_LINK; pulse++) {
      const pointIndex = i * FLOW_PARTICLES_PER_LINK + pulse;
      flowColor.setXYZ(pointIndex, baseColor.r, baseColor.g, baseColor.b);
    }
  });
  hiPos.needsUpdate = true; hiColor.needsUpdate = true; flowColor.needsUpdate = true;
  highlightGeometry.setDrawRange(0, activeHighlightLinks.length * ARC_SEGMENTS * 2);
  flowGeometry.setDrawRange(0, activeHighlightLinks.length * FLOW_PARTICLES_PER_LINK);

  visibleLabelNodes = relationDepth
    ? nodes.filter(node => (relationDepth.get(node.key) ?? 99) <= 1)
      .sort((a, b) => (a === selected ? -1 : b === selected ? 1 : 0))
    : [];
  labelLayer.innerHTML = visibleLabelNodes.map(node => `
    <span class="node-label ${node === selected ? 'selected' : ''}" style="--node-color:${CONFIG.colors[node.category]}">
      <i></i><b>${nodeDisplayLabel(node)}</b><em>${msg().category[node.category]}</em>
    </span>`).join('');
  visibleLabelElements = [...labelLayer.children];
}
refreshNodes();

const filtersEl = document.querySelector('#filters');
function renderFilters() {
  filtersEl.innerHTML = FILTERS.map(f => `<button class="filter ${activeFilter === f.key ? 'active' : ''}" data-filter="${f.key}">${msg().filter[f.key]}</button>`).join('');
}
function renderLegend() {
  document.querySelector('#legend-items').innerHTML = categoryKeys.map(key => `<span><i style="--color:${CONFIG.colors[key]}"></i>${msg().category[key]}</span>`).join('');
}

let activeFilter = 'all';
let selectedNode = null;
let hoveredNode = null;
let cameraTween = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(2, 2);
const tooltip = document.querySelector('#tooltip');
const detail = document.querySelector('#detail');
renderFilters(); renderLegend();

filtersEl.addEventListener('click', event => {
  const button = event.target.closest('[data-filter]'); if (!button) return;
  activeFilter = button.dataset.filter;
  filtersEl.querySelectorAll('.filter').forEach(el => el.classList.toggle('active', el === button));
  refreshNodes(selectedNode, hoveredNode, activeFilter);
});

function nodeDescription(node) {
  if (node.key === 'about') return locale === 'en' ? node.descriptionEn : node.description;
  if (node.type === 'knife') return locale === 'en' ? (node.descriptionEn || englishDescriptions[node.id] || node.description) : node.description;
  if (locale === 'en' && node.descriptionEn) return node.descriptionEn;
  if (locale === 'zh' && node.description) return node.description;
  return conceptExplanation(node, locale, node.knives?.length || 0) || msg().meta[node.category][1];
}

function nodeDisplayLabel(node) {
  if (node.type === 'knife') return (locale === 'zh' ? node.name_zh : node.name_en) || node.name;
  return (locale === 'zh' ? node.name_zh : node.name_en) || node.label;
}

function localizedFacetName(category, value, qualifier = '') {
  const entry = ATTRIBUTE_ENTRIES.get(facetKey(category, value, qualifier));
  return (locale === 'zh' ? entry?.name_zh : entry?.name_en) || value;
}

function trustMarkup(node) {
  if (node.key === 'about') return '';
  const sources = Array.isArray(node.sources) ? node.sources : [];
  const verified = Boolean(node.verified);
  const sourceLabel = sources.length ? (locale === 'zh' ? `${sources.length} 条来源` : `${sources.length} source${sources.length > 1 ? 's' : ''}`) : (locale === 'zh' ? '缺少来源' : 'No sources');
  const verifiedLabel = verified ? (locale === 'zh' ? '刀友已认证' : 'Community verified') : (locale === 'zh' ? '待刀友认证' : 'Unverified');
  return `<div class="trust-row"><span class="trust-badge ${sources.length ? 'ok' : 'warn'}">${sourceLabel}</span><span class="trust-badge ${verified ? 'ok' : 'warn'}">${verifiedLabel}</span></div>
    ${sources.length ? `<div class="source-list">${sources.map((source, index) => `<a href="${source}" target="_blank" rel="noreferrer">${locale === 'zh' ? `来源 ${index + 1}` : `Source ${index + 1}`} ↗</a>`).join('')}</div>` : ''}`;
}

function showDetail(node, focus = true) {
  selectedNode = node;
  const isKnife = node.type === 'knife';
  const relatedKnives = isKnife ? [] : node.knives.map(id => nodeByKey.get(id).node);
  detail.innerHTML = `
    <button class="detail-close" aria-label="${msg().close}">×</button>
    <p class="detail-kicker"><i style="--color:${CONFIG.colors[node.category]}"></i>${msg().category[node.category]} · ${isKnife ? localizedFacetName('origin', node.origin) : msg().relatedCount(relatedKnives.length)}</p>
    <h2>${nodeDisplayLabel(node)}</h2>
    ${isKnife ? `<p class="detail-maker">${localizedFacetName('brand', node.brand)} <span>${msg().number} ${String(KNIVES.findIndex(k => k.id === node.id) + 1).padStart(3, '0')}</span></p>` : `<p class="detail-maker">${msg().meta[node.category][0]}${node.qualifier ? ` · ${node.qualifier === 'blade' ? (locale === 'zh' ? '刀刃' : 'Blade') : (locale === 'zh' ? '刀柄' : 'Handle')}` : ''}</p>`}
    <div class="detail-rule"></div>
    <p class="detail-description">${nodeDescription(node)}</p>
    ${!isKnife && node.category === 'lock' ? lockDiagram(node.label, locale) : ''}
    ${trustMarkup(node)}
    ${isKnife ? `<dl>
      <div><dt>${msg().field.bladeMaterial}</dt><dd>${localizedFacetName('material', node.materials?.find(m => m.part === 'blade')?.value || '—', 'blade')}</dd></div><div><dt>${msg().field.handleMaterial}</dt><dd>${localizedFacetName('material', node.materials?.find(m => m.part === 'handle')?.value || '—', 'handle')}</dd></div>
      <div><dt>${msg().field.lock}</dt><dd>${localizedFacetName('lock', node.lock)}</dd></div><div><dt>${msg().field.blade}</dt><dd>${node.blade}</dd></div>
      <div><dt>${msg().field.weight}</dt><dd>${node.weight}</dd></div><div><dt>${msg().field.designer}</dt><dd>${valueFor(node.designer, locale)}</dd></div><div><dt>${msg().field.year}</dt><dd>${node.year}</dd></div>
    </dl>` : `<div class="related-list">${relatedKnives.slice(0, 7).map(k => `<button data-node="${k.key}"><span>${nodeDisplayLabel(k)}</span><em>${localizedFacetName('brand', k.brand)}</em></button>`).join('')}</div>`}
    <footer><span>${msg().connected}</span><strong>${isKnife ? (adjacency.get(node.key)?.size || 0) : relatedKnives.length}</strong></footer>
  `;
  detail.classList.add('open');
  refreshNodes(selectedNode, hoveredNode, activeFilter);
  controls.autoRotate = true;
  if (focus && node.position) {
    const focusNodes = [node, ...[...(adjacency.get(node.key) || [])].map(key => nodeByKey.get(key)?.node).filter(Boolean)];
    const focusCenter = focusNodes.reduce((center, item) => center.add(item.position), new THREE.Vector3()).multiplyScalar(1 / focusNodes.length);
    const extent = Math.max(...focusNodes.map(item => item.position.distanceTo(focusCenter)), 7);
    const direction = camera.position.clone().sub(controls.target).normalize();
    cameraTween = { start: performance.now(), fromTarget: controls.target.clone(), toTarget: focusCenter, fromCamera: camera.position.clone(), toCamera: focusCenter.clone().add(direction.multiplyScalar(Math.min(45, Math.max(23, extent * 2.8)))) };
  }
}

detail.addEventListener('click', event => {
  if (event.target.closest('.detail-close')) {
    detail.classList.remove('open'); selectedNode = null; refreshNodes(null, hoveredNode, activeFilter); controls.autoRotate = true; return;
  }
  const related = event.target.closest('[data-node]'); if (related) showDetail(nodeByKey.get(related.dataset.node).node);
});

canvas.addEventListener('pointermove', event => {
  pointer.x = (event.clientX / innerWidth) * 2 - 1; pointer.y = -(event.clientY / innerHeight) * 2 + 1;
  nebulaMouseTarget.copy(pointer);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(nodeMesh, false)[0];
  const next = hit ? nodes[hit.instanceId] : null;
  if (next !== hoveredNode) { hoveredNode = next; refreshNodes(selectedNode, hoveredNode, activeFilter); }
  canvas.style.cursor = next ? 'pointer' : 'grab';
  if (next) {
    tooltip.innerHTML = `<span>${msg().category[next.category]}</span><b>${nodeDisplayLabel(next)}</b>`;
    tooltip.style.transform = `translate(${event.clientX + 18}px, ${event.clientY + 18}px)`;
    tooltip.classList.add('visible');
  } else tooltip.classList.remove('visible');
});
canvas.addEventListener('pointerleave', () => { hoveredNode = null; nebulaMouseTarget.set(0, 0); tooltip.classList.remove('visible'); refreshNodes(selectedNode, null, activeFilter); });
canvas.addEventListener('click', () => { if (hoveredNode) showDetail(hoveredNode); });
canvas.addEventListener('wheel', event => { densityTarget = THREE.MathUtils.clamp(densityTarget - Math.sign(event.deltaY) * .045, .42, 1); }, { passive:true });

const searchInput = document.querySelector('#search');
const searchResults = document.querySelector('#search-results');
function search(query) {
  const q = query.trim().toLocaleLowerCase();
  if (!q) { searchResults.classList.remove('open'); return; }
  const matches = nodes.filter(n => [n.label, nodeDisplayLabel(n), n.name_zh, n.name_en, n.brand, n.lock, n.origin, ...(n.tags || []), ...(n.materials || []).map(m => m.value)].filter(Boolean).some(v => String(v).toLocaleLowerCase().includes(q))).slice(0, 7);
  searchResults.innerHTML = matches.length ? matches.map(n => `<button data-node="${n.key}"><i style="--color:${CONFIG.colors[n.category]}"></i><span><b>${nodeDisplayLabel(n)}</b><em>${msg().category[n.category]}${n.brand && n.type === 'knife' ? ` · ${localizedFacetName('brand', n.brand)}` : ''}</em></span><strong>↗</strong></button>`).join('') : `<p>${msg().noResults}</p>`;
  searchResults.classList.add('open');
}
searchInput.addEventListener('input', () => search(searchInput.value));
searchResults.addEventListener('click', event => {
  const result = event.target.closest('[data-node]'); if (!result) return;
  searchResults.classList.remove('open'); searchInput.value = ''; showDetail(nodeByKey.get(result.dataset.node).node);
});
addEventListener('keydown', event => {
  if (event.key === '/' && document.activeElement !== searchInput) { event.preventDefault(); searchInput.focus(); }
  if (event.key === 'Escape') { searchResults.classList.remove('open'); searchInput.blur(); if (selectedNode) detail.querySelector('.detail-close')?.click(); }
});
document.addEventListener('click', e => { if (!e.target.closest('.search-panel')) searchResults.classList.remove('open'); });

document.querySelector('[data-action="about"]').addEventListener('click', () => showDetail({
  key:'about', label:msg().aboutTitle, type:'attribute', category:'brand', knives: KNIVES.map(k => k.id),
  description:messages.zh.aboutDescription, descriptionEn:messages.en.aboutDescription
}));

document.querySelector('[data-action="locale"]').addEventListener('click', () => {
  locale = locale === 'zh' ? 'en' : 'zh';
  localStorage.setItem('knife-world-locale', locale);
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  document.querySelector('[data-action="locale"]').textContent = locale === 'zh' ? '中文' : 'EN';
  document.querySelector('.about-label').textContent = msg().about;
  document.querySelector('#hero-title').innerHTML = msg().hero;
  document.querySelector('#hero-lede').innerHTML = msg().lede;
  document.querySelector('#hint-label').textContent = msg().hint;
  searchInput.placeholder = msg().search;
  renderFilters(); renderLegend();
  if (searchInput.value) search(searchInput.value);
  if (selectedNode) {
    if (selectedNode.key === 'about') selectedNode.label = msg().aboutTitle;
    showDetail(selectedNode, false);
  }
});

let lastTime = performance.now(), frameCount = 0, fpsTime = lastTime;
const labelProjection = new THREE.Vector3();
function updateNodeLabels() {
  visibleLabelNodes.forEach((node, index) => {
    const element = visibleLabelElements[index]; if (!element) return;
    labelProjection.copy(node.position).project(camera);
    const visible = labelProjection.z > -1 && labelProjection.z < 1 && Math.abs(labelProjection.x) < 1.05 && Math.abs(labelProjection.y) < 1.05;
    const x = (labelProjection.x * .5 + .5) * innerWidth;
    const y = (-labelProjection.y * .5 + .5) * innerHeight;
    element.style.transform = `translate3d(${x + 13}px,${y - 10}px,0)`;
    element.style.opacity = visible ? '1' : '0';
  });
}
function animate(time) {
  requestAnimationFrame(animate);
  if (cameraTween) {
    const p = Math.min(1, (time - cameraTween.start) / 850); const eased = 1 - Math.pow(1 - p, 4);
    controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
    camera.position.lerpVectors(cameraTween.fromCamera, cameraTween.toCamera, eased);
    if (p === 1) cameraTween = null;
  }
  sphereMaterial.uniforms.uTime.value = time * .001;
  starMaterial.uniforms.uTime.value = time * .001 * CONFIG.scene.nebulaFlowSpeed;
  nebulaMouse.lerp(nebulaMouseTarget, .045); starMaterial.uniforms.uMouse.value.copy(nebulaMouse);
  starMaterial.uniforms.uDensity.value += (densityTarget - starMaterial.uniforms.uDensity.value) * .035;
  nebula.rotation.y += .000055;
  const flowPosition = flowGeometry.attributes.position;
  activeHighlightLinks.forEach((link, i) => {
    for (let pulse = 0; pulse < FLOW_PARTICLES_PER_LINK; pulse++) {
      const phase = (time * .00018 + i * .137 + pulse / FLOW_PARTICLES_PER_LINK) % 1;
      pointOnArc(link, phase, arcScratchA);
      flowPosition.setXYZ(i * FLOW_PARTICLES_PER_LINK + pulse, arcScratchA.x, arcScratchA.y, arcScratchA.z);
    }
  });
  if (activeHighlightLinks.length) flowPosition.needsUpdate = true;
  highlightMaterial.opacity = .78 + Math.sin(time * .0022) * .16;
  highlightAuraMaterial.opacity = .2 + Math.sin(time * .0017 + 1.2) * .07;
  controls.update(); updateNodeLabels(); renderer.render(scene, camera);
  frameCount++;
  if (time - fpsTime > 1000) { document.querySelector('#fps').textContent = `${Math.round(frameCount * 1000 / (time - fpsTime))} FPS`; frameCount = 0; fpsTime = time; }
  lastTime = time;
}
requestAnimationFrame(animate);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, CONFIG.scene.pixelRatioMax)); renderer.setSize(innerWidth, innerHeight);
  glowMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  outerGlowMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  starMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
});
