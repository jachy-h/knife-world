# KNIFE WORLD · 刃之星图

一个以 Three.js 实例化渲染实现的刀具关系三维展示页。刀具与品牌、钢材、锁定、类型、产地共同构成可搜索、可探索的星图。

## 启动

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

## 调整内容

- `src/config.js`：品牌文案、空间参数、节点尺寸、颜色、性能上限与筛选项。
- `src/data.js`：仅供 `wiki:generate` 使用的历史种子；页面运行时不会读取。
- `wiki/`：网站实际读取的 Markdown 内容源，每把刀和每个属性各自独立。
- `src/i18n.js`：中英文界面、字段翻译与刀具英文介绍。
- `src/concepts.js`：属性概念解释、锁定方式翻译、资料来源与 SVG 机构示意图。
- `src/main.js`：关系图构建、实例化 WebGL 渲染和交互。
- `src/style.css`：界面视觉与响应式布局。

目前包含 25 把演示数据，覆盖 Spyderco、Benchmade、Cold Steel、SOG、CRKT、三刃木、Maxace 等品牌。接入完整数据源时，只需把标准化后的记录映射成 `KNIVES` 的字段格式；渲染层以 InstancedMesh、双层合批 Points 和合并 LineSegments 控制 draw call，不会为每颗星球创建独立 DOM 或 Mesh。

中英文界面与刀具英文介绍位于 `src/i18n.js`。语言偏好会写入浏览器本地存储并在下次访问时恢复。

不同节点类别由同一实例化 ShaderMaterial 呈现不同材质逻辑：刀具为冷白金属切面，品牌为暖色脉动表面，钢材为蓝色晶体反射，锁定为紫色机械环纹，类型为柔和渐变，产地为经纬线式表面。选中节点时会保留两跳关系并自动调整相机构图。

## Wiki 贡献与发布

直接编辑 `wiki/knives/` 或 `wiki/attributes/` 中的 Markdown 并提交 Pull Request。页面构建会读取这些文件，无需同步修改 JavaScript。`npm run wiki:generate` 仅用于从旧数据重新生成整套初始 Wiki，日常贡献请勿运行，以免覆盖内容。

`.github/workflows/deploy-pages.yml` 会在代码推送到 `main` 后自动构建并发布 GitHub Pages。仓库首次启用时，请在 GitHub 的 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。
