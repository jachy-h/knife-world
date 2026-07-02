const LOCKS = {
  'AXIS Lock': {
    type:'crossbar', zh:'横轴锁', en:'AXIS Lock',
    zhText:'弹簧推动横向锁栓卡入刀根斜面。锁栓横跨两侧钢衬，受力较均衡；向后拉动锁栓即可释放，手指无需进入刃口路径。',
    enText:'Springs drive a transverse bar against a ramp on the blade tang. The bar spans both liners for balanced lockup; pulling it back releases the blade while fingers stay clear of the edge path.',
    source:'https://support.benchmade.com/hc/en-us/articles/39748930381339-Knife-Mechanisms',
  },
  'Clutch Lock': { type:'crossbar', zh:'可调横轴锁', en:'Clutch Lock', zhText:'横轴锁栓在弹簧作用下顶住刀根。其特色是可调节弹簧预紧力，让开合阻力与回弹速度适应不同使用者。', enText:'A spring-driven crossbar engages the blade tang. Adjustable spring preload lets the user tune deployment resistance and return speed.' },
  'XR Lock': { type:'crossbar', zh:'XR 横轴锁', en:'XR Lock', zhText:'双侧可操作的横轴锁栓在刀根后方承力。拉回锁栓释放刀刃，兼顾左右手操作与手指避让。', enText:'An ambidextrous crossbar bears behind the blade tang. Pulling it back releases the blade while keeping fingers outside the closing path.' },
  'Frame Lock': { type:'sidebar', zh:'框架锁', en:'Frame Lock', zhText:'刀柄框架本身切出弹性锁片。开刀后锁片横向弹入刀根斜面，以最少零件形成直接、坚固的承力路径。', enText:'A spring section cut directly from the handle frame moves behind the blade tang, creating a direct and robust load path with very few parts.', source:'https://spyderco.com/pages/locking-mechanisms' },
  'Liner Lock': { type:'sidebar', zh:'衬片锁', en:'Liner Lock', zhText:'刀柄内部的弹性钢衬横向顶住刀根斜面。推开钢衬即可收刀，结构轻薄且适合单手操作。', enText:'A spring liner inside the handle moves laterally against the tang ramp. Pushing it aside releases the blade; the construction is slim and one-hand friendly.', source:'https://spyderco.com/pages/locking-mechanisms' },
  'Compression Lock': { type:'compression', zh:'压缩锁', en:'Compression Lock', zhText:'弹性锁片楔入刀根斜面与止刀柱之间，让主要载荷以压缩方式传递；释放区位于刀背侧，手指远离刃口。', enText:'A spring liner wedges between the tang ramp and stop pin, carrying the main load in compression. Its spine-side release keeps fingers clear of the edge.', source:'https://spyderco.com/pages/locking-mechanisms' },
  'Tri-Ad Lock': { type:'backbar', zh:'Tri-Ad 三点锁', en:'Tri-Ad Lock', zhText:'在传统背锁基础上增加独立止刀柱，将刀根载荷分散到柄架；锁杆与刀根的几何还能随磨损继续深入咬合。', enText:'An independent stop pin redistributes tang loads into the frame. The rocker geometry can seat progressively deeper as components wear.', source:'https://www.coldsteel.com/tri-ad-lock/' },
  'Shark Lock': { type:'backbar', zh:'鲨鱼锁', en:'Shark Lock', zhText:'刀背上的弹簧锁块从上方咬合刀根。向后拉动外露锁鳍即可解锁，闭合时手指不必经过刃口路径。', enText:'A spring-loaded block above the tang locks the blade. Pulling the exposed fin rearward releases it, allowing closure away from the edge path.' },
  'Button Lock': { type:'button', zh:'按钮锁', en:'Button Lock', zhText:'横向柱塞在弹簧作用下进入刀根缺口。按下按钮让柱塞退出缺口，从而释放刀刃。', enText:'A spring-loaded transverse plunger enters a recess in the tang. Pressing the button withdraws the plunger and releases the blade.' },
  'Slip Joint': { type:'spring', zh:'滑动关节', en:'Slip Joint', zhText:'背部弹簧压住刀根平面，只提供定位阻力而不形成真正锁定。它结构传统，但使用时不能依赖锁止承载。', enText:'A backspring presses against flats on the tang to provide positional resistance, not a true lock. It is traditional and should not be relied on for lock-bearing loads.', source:'https://spyderco.com/pages/locking-mechanisms' },
  'Virobloc': { type:'collar', zh:'旋转环锁', en:'Virobloc Collar', zhText:'旋转金属套环遮挡刀刃根部的运动通道，可在打开或闭合位置形成机械限位。', enText:'A rotating metal collar blocks the blade tang’s travel path, creating a mechanical stop in the open or closed position.' },
  'Radius Lock': { type:'button', zh:'弧轨锁', en:'Radius Lock', zhText:'控制钮沿弧形轨道运动，同时驱动内部机构释放刀根。开合路径被直接转化为外部可见的圆周动作。', enText:'A control travels through an arced track to release the tang, translating the internal deployment path into a visible circular gesture.' },
  'Fixed Blade': { type:'fixed', zh:'直刀结构', en:'Fixed Blade', zhText:'刀身与刀柄之间没有折叠关节，也就不需要锁定机构。连续刀茎直接把载荷传入刀柄，结构最为直接。', enText:'With no folding joint, no lock is required. A continuous tang carries load directly into the handle—the simplest structural path.' },
};

const MAJOR_BRANDS = {
  Spyderco:['以圆孔开刀、功能优先的人体工学和大量钢材实验著称。','Known for the round opening hole, function-first ergonomics and extensive steel experimentation.'],
  Benchmade:['以 AXIS 锁平台、俄勒冈制造和轻量高性能折刀建立辨识度。','Defined by the AXIS platform, Oregon manufacturing and lightweight high-performance folders.'],
  'Cold Steel':['强调结构强度、极限测试与 Andrew Demko 设计的 Tri-Ad 锁。','Centered on structural strength, hard-use testing and Andrew Demko’s Tri-Ad lock.'],
  SOG:['从特种工具语汇转向兼顾城市携带的多方式操作设计。','Evolved from special-operations tool language toward multi-action urban carry designs.'],
  CRKT:['通过与独立设计师合作，把定制刀语言转化为可普及的量产工具。','Translates custom-maker ideas into accessible production tools through designer collaborations.'],
  '三刃木':['中国量产刀具品牌，以成熟结构、稳定加工和实用定价形成影响力。','A Chinese production brand recognized for proven mechanisms, consistent machining and pragmatic value.'],
  Maxace:['聚焦高端中国制造，以钛、碳纤维和复杂机械结构展现精密加工。','Represents high-end Chinese production through titanium, carbon fiber and complex precision mechanisms.'],
};

const STYLES = {
  EDC:['强调随身尺寸、操作便利与高频日常切割。','Balances pocketable size, convenient operation and frequent everyday cutting.'],
  户外:['偏向耐候、握持稳定和更宽泛的野外任务。','Prioritizes weather resistance, secure grip and broad field tasks.'],
  绅士:['以纤薄比例、克制外形和低侵入感适应正式环境。','Uses slim proportions and restrained forms to feel at home in formal settings.'],
  海事:['围绕耐腐蚀、易清洁和湿手操作设计。','Designed around corrosion resistance, easy cleaning and wet-hand operation.'],
  收藏:['机械表达、材料工艺或稀有性比纯工具效率占更大权重。','Gives mechanical expression, materials and rarity more weight than pure utility.'],
  多功能:['把多种工具压缩进同一便携平台。','Compresses several tools into one portable platform.'],
  传统:['保留历史比例、材料或非锁定式操作习惯。','Preserves historical proportions, materials or non-locking operation.'],
  生存:['强调可靠、易维护和在资源有限环境中的多用途能力。','Emphasizes reliability, field maintenance and versatility when resources are limited.'],
  战术:['倾向快速操作、明确防滑与更高结构余量。','Favors rapid operation, assertive grip and greater structural margin.'],
};

export function lockName(value, locale) { return LOCKS[value]?.[locale] || value; }
export function lockInfo(value, locale) {
  const item = LOCKS[value];
  if (!item) return null;
  return { type:item.type, text:locale === 'zh' ? item.zhText : item.enText, source:item.source };
}

export function conceptExplanation(node, locale, count) {
  const zh = locale === 'zh';
  if (node.category === 'lock') return lockInfo(node.label, locale)?.text;
  if (node.category === 'brand') {
    const known = MAJOR_BRANDS[node.label];
    return known?.[zh ? 0 : 1] || (zh ? `${node.label} 品牌节点连接 ${count} 把刀，呈现其共同的制造语言与设计取向。` : `The ${node.label} node connects ${count} knives and reveals their shared manufacturing and design language.`);
  }
  if (node.category === 'material') {
    if (node.qualifier === 'handle') {
      return zh
        ? `${node.label} 作为刀柄材质，影响整刀重量、刚性、耐候性、握持触感与加工方式。这个节点连接 ${count} 把刀。`
        : `As a handle material, ${node.label} affects weight, rigidity, weather resistance, grip feel and manufacturing. This node connects ${count} knives.`;
    }
    const powder = /CPM|M390|Elmax|Vanax|MagnaCut|YXR7|3V/.test(node.label);
    return zh
      ? `${node.label} 是${powder ? '高合金或粉末冶金' : '常规熔炼'}刀具钢。这个节点连接 ${count} 把刀，便于观察它在刃口保持、韧性、耐蚀性与易磨性之间的应用取舍。`
      : `${node.label} is a ${powder ? 'high-alloy or powder-metallurgy' : 'conventionally melted'} blade steel. Its ${count} connections reveal how makers trade edge retention, toughness, corrosion resistance and sharpening.`;
  }
  if (node.category === 'tag') return STYLES[node.label]?.[zh ? 0 : 1] || (zh ? '标签描述刀具的一种使用或设计倾向，一把刀可以同时拥有多个标签。' : 'A tag describes one use or design tendency; a knife may carry several tags at once.');
  if (node.category === 'origin') return zh ? `${node.label} 制造节点连接 ${count} 把刀，展示当地供应链、加工传统与设计文化如何进入产品。` : `The ${node.label} origin node connects ${count} knives, showing how local supply chains, craft traditions and design culture enter the product.`;
  return node.description;
}

export function lockDiagram(value, locale) {
  const info = lockInfo(value, locale); if (!info) return '';
  const labels = locale === 'zh' ? { blade:'刀根', lock:'锁件', force:'受力', release:'释放' } : { blade:'TANG', lock:'LOCK', force:'LOAD', release:'RELEASE' };
  const horizontal = ['crossbar','button'].includes(info.type);
  return `<div class="mechanism-diagram" data-type="${info.type}">
    <svg viewBox="0 0 300 126" role="img" aria-label="${lockName(value, locale)}">
      <path class="diagram-handle" d="M22 33 H276 Q287 33 287 45 V104 H22 Z"/>
      <path class="diagram-blade" d="M132 35 L142 18 L278 12 L214 48 L144 63 Z"/>
      <circle class="diagram-pivot" cx="143" cy="48" r="8"/>
      ${horizontal ? '<path class="diagram-lock" d="M97 54 H137 V70 H97 Q88 62 97 54 Z"/><path class="diagram-motion" d="M93 62 H55"/>' : '<path class="diagram-lock" d="M68 78 L126 56 L135 68 L78 91 Z"/><path class="diagram-motion" d="M80 92 L61 107"/>'}
      <path class="diagram-force" d="M174 28 L158 45"/>
      <text x="222" y="30">${labels.blade}</text><text x="34" y="78">${labels.lock}</text>
      <text x="181" y="21">${labels.force}</text><text x="29" y="116">${labels.release}</text>
    </svg>
    <span>${locale === 'zh' ? '示意图 · 非工程比例' : 'SCHEMATIC · NOT TO SCALE'}</span>
  </div>`;
}
