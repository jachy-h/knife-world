# Knife World Wiki

本目录是网站的静态快照和 Supabase 故障兜底。正式数据通过网站的 `/admin.html` 上传。

- `knives/`：每把刀一份文档；`materials` 与 `tags` 均为数组。
- `attributes/brand/`：品牌。
- `attributes/material/`：刀刃与刀柄材质。
- `attributes/lock/`：锁定结构。
- `attributes/tag/`：可多选标签。
- `attributes/origin/`：制造地区。

每份文档必须保留 `sources`、`verified`、`verified_by` 字段，以及“中文”和“English”二级标题。没有来源或刀友认证时请保留空数组与 `false`，页面会自动显示待完善标记。修改合并到主分支后，GitHub Actions 会自动重新构建并发布 GitHub Pages。
