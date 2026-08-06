# Titia 时序

一款温柔、私密、离线优先的个人生活操作系统。正式入口为 iOS/iPadOS 17+ 主屏幕 PWA，业务数据仅保存在当前 PWA 的 IndexedDB 中。

本项目是独立静态 PWA，不包含 ChatGPT 登录、注册、用户账号、服务端数据库或远程同步。打开部署网址即可直接进入应用。

## 功能

- 今日：待办与购物摘要
- 小窝：倒数日、购物、周期、宠物、加密密码箱
- 小账：账单、资产、预算、分析、分类与自动识别扩展接口
- 时光：日记、关系记录和灵光一闪
- 我呀：个人资料、数据备份与恢复

## 本地验证

```bash
pnpm test:unit
pnpm lint
pnpm build
node --test tests/rendered-html.node-test.mjs
```

## 部署

### Cloudflare Pages（推荐）

- Root directory：`site`
- Build command：`pnpm build`
- Build output directory：`dist`

仓库根目录就是本目录时，Root directory 留空。

### Vercel

选择 Vite 框架，构建命令使用 `pnpm build`，输出目录使用 `dist`。`vercel.json` 已包含单页应用回退配置。

### GitHub Pages

在仓库 Settings → Pages 中选择 GitHub Actions。`.github/workflows/pages.yml` 会按仓库名设置部署基础路径并发布 `site/dist`。

## 数据迁移与隐私

数据不会上传到服务器。请在“我呀 → 数据管理”中定期导出备份。

浏览器数据按域名隔离。从旧的 `chatgpt.site` 地址迁移到新域名时，必须先在旧应用中导出备份，再到新网址导入恢复；随后从新网址重新添加主屏幕 PWA。

## V1.1 小账升级

- 账单、资产、分析、分类、导入导出页面均使用真实 IndexedDB 数据生成顶部概览。
- 交易分类来自《小账交易分类体系规划》，按支出与收入分开，并保存一级/二级关系。
- 数据管理中心支持 Excel 全量工作簿、CSV 账单导出，以及 Excel 预览确认导入。
- AI 识别是独立入口：图片仅在当前设备预览；浏览器支持本地文字检测时直接识别，否则可粘贴 OCR 文本生成账单草稿，确认后才写入账本。
- 灵光一闪按钮默认 70% 透明度，长按一秒后可拖动和调整透明度；位置及设置保存在 IndexedDB。

AppData 会从 V1 自动归一化到 V2，保留原有业务数据。V2 新增 `ledgerCategories`、`preferences.sparkFab` 和 `backupMeta.lastSpreadsheetExportAt`，不引入账号或服务器同步。
