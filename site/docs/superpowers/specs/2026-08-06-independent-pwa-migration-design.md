# Titia 独立 PWA 迁移设计

## 目标

将 Titia 从 ChatGPT Sites/Vinext 托管壳迁移为标准 Vite + React 静态 PWA。用户打开网址后直接进入应用，不注册、不登录、不建立用户体系；所有现有页面、视觉、交互、Dexie/IndexedDB 数据结构和导入导出能力保持不变。

## 架构

- `app/TitiaApp.tsx` 与 `app/lib/store.ts` 继续作为应用和本地数据核心，不做页面重构。
- 新增标准 `index.html` 与 `src/main.tsx` 浏览器入口，构建输出统一为 `dist/`。
- 使用 Vite 的 `base` 处理根域名和 GitHub Pages 仓库子路径。
- 保留自有 Service Worker，但让注册路径和缓存路径基于部署目录计算，兼容 Vercel、Cloudflare Pages 与 GitHub Pages。
- 删除未被引用的 ChatGPT Auth 帮助代码，以及仅供 ChatGPT Sites/Vinext 使用的托管、Worker 和示例数据库代码。

## 部署

- 默认推荐 Cloudflare Pages：构建命令 `pnpm build`，产物 `dist`。
- Vercel 使用 `vercel.json` 将未知路径回退到 `index.html`。
- Cloudflare Pages 使用 `public/_redirects` 提供显式 SPA 回退。
- GitHub Pages 使用 Actions 构建；仓库名通过 `VITE_BASE_PATH` 注入，不硬编码项目名称。

## 数据与隐私

应用壳是公开静态资源，但个人记录仅存于当前浏览器来源的 IndexedDB。不同域名不会共享 IndexedDB；从旧地址迁移时，用户必须先导出备份，再在新地址导入。后续数据库升级必须继续使用 Dexie 版本迁移，不能清空现有数据。

## 验收标准

- 构建产物不包含 ChatGPT、Sites、Vinext 或登录依赖。
- 打开根地址直接渲染 Titia。
- 所有现有单元测试通过。
- 静态 HTML 包含正确中文元信息和 PWA 声明。
- Service Worker 可在根路径和仓库子路径注册。
- Cloudflare Pages、Vercel、GitHub Pages 配置均存在且指向 `dist/`。

