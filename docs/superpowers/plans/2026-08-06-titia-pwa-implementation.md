# Titia 时序 PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从零构建、验证并发布一款 iOS/iPadOS 17+、纯本地、离线优先的 Titia 时序 PWA。

**Architecture:** React 功能域通过 service/repository 写入 Dexie/IndexedDB，页面使用 live query 读取；Service Worker 只缓存应用壳。业务域独立，跨表写入使用事务，备份和迁移在数据库边界统一处理。

**Tech Stack:** React 19、TypeScript、Vite、Dexie、React Router、Zod、Vitest、Testing Library、Playwright、vite-plugin-pwa。

## Global Constraints

- 正式入口为 iOS/iPadOS 17+ 主屏幕 PWA；Safari 只提供安装与恢复说明。
- 业务数据只保存在 IndexedDB，禁止以 React state 作为唯一数据源，禁止展示型 mock 数据。
- 视觉使用浅蓝天空、云朵、低饱和色、半透明白色大圆角卡片和柔和阴影。
- 密码箱使用 PBKDF2 + AES-GCM；主密码不落盘且不可找回。
- 小账必须预留 `TransactionImportAdapter` 和自动识别元数据，但本期不实现 OCR/通知识别。
- 每项功能先写失败测试，再实现；每个阶段必须通过类型检查、测试和生产构建。

---

## File Map

- `src/app/*`: 应用壳、路由、导航、安装门、错误边界。
- `src/db/*`: Dexie schema、实体基类、迁移、数据库测试工厂。
- `src/ui/*`: Card、Sheet、Dialog、FormField、EmptyState、Timeline、FAB。
- `src/features/<domain>/*`: 每个业务域的模型、service、页面和测试。
- `src/services/*`: 日期/农历、媒体、加密、备份、统计等跨域纯服务。
- `src/styles/*`: token、全局样式、布局与动效。
- `e2e/*`: 真实浏览器 CRUD、离线、备份和 PWA 验收。

### Task 1: 工程壳与测试基线

**Files:** Create `package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/test/setup.ts`, `src/app/App.test.tsx`.

**Interfaces:** Produces `App(): JSX.Element` and scripts `dev`, `build`, `test`, `test:e2e`, `lint`, `typecheck`.

- [ ] 写 `App.test.tsx`，断言五个导航标签和主内容存在；运行 `pnpm test -- App.test.tsx`，确认因模块缺失失败。
- [ ] 创建 Vite React TS 工程配置和最小 `App`；依赖固定到 lockfile。
- [ ] 运行 `pnpm typecheck && pnpm test -- App.test.tsx && pnpm build`，预期全部成功。
- [ ] 提交 `chore: scaffold Titia PWA`。

### Task 2: 视觉系统与响应式应用壳

**Files:** Create `src/styles/tokens.css`, `src/styles/global.css`, `src/ui/Card.tsx`, `src/ui/FloatingAction.tsx`, `src/app/BottomNav.tsx`, related tests.

**Interfaces:** Produces `Card`, `FloatingAction({label,onClick})`, `BottomNav`; consumes React Router navigation.

- [ ] 写组件测试，验证导航选中态、FAB 可访问名称、Card 内容和安全区 class；确认失败。
- [ ] 实现天空渐变、CSS 云朵、玻璃卡片、五栏导航、iPhone/平板布局和 reduced-motion。
- [ ] 运行组件测试、axe 可访问性断言和生产构建。
- [ ] 提交 `feat: add Titia visual system and shell`。

### Task 3: IndexedDB 基础与实时数据边界

**Files:** Create `src/db/types.ts`, `src/db/TitiaDatabase.ts`, `src/db/database.ts`, `src/db/database.test.ts`, `src/hooks/useDatabaseStatus.ts`.

**Interfaces:** Produces `TitiaDatabase`, `db`, `BaseEntity {id,createdAt,updatedAt,schemaVersion}`, `newEntity()`, `touchEntity()`.

- [ ] 使用 fake-indexeddb 写失败测试：建库、全部表存在、事务回滚、刷新式重开后记录仍存在。
- [ ] 实现 schema v1，包含 users/todos/shopping/periods/countdowns/pets/petRecords/vaultMeta/accounts/transactions/budgets/categories/diaries/relationships/media/settings/importBatches。
- [ ] 实现数据库初始化错误和配额错误的中文映射；运行数据库测试。
- [ ] 提交 `feat: add persistent IndexedDB foundation`。

### Task 4: 通用 CRUD UI 与表单约束

**Files:** Create `src/ui/Sheet.tsx`, `src/ui/ConfirmDialog.tsx`, `src/ui/FormField.tsx`, `src/ui/EmptyState.tsx`, `src/ui/ToastProvider.tsx`, tests.

**Interfaces:** Produces controlled Sheet/Dialog components and `useToast()`; dialogs restore focus and trap keyboard focus.

- [ ] 写失败测试覆盖打开/关闭、Escape、焦点恢复、必填提示和删除二次确认。
- [ ] 实现组件，所有触控目标至少 44px，保存中禁用重复提交。
- [ ] 运行 UI 测试和无障碍测试。
- [ ] 提交 `feat: add accessible CRUD primitives`。

### Task 5: 今日、待办与购物

**Files:** Create `src/features/today/*`, `src/features/todos/*`, `src/features/shopping/*` including models, services, pages and tests.

**Interfaces:** Produces `todoService.create/update/toggle/remove`, `shoppingService.create/toggle/remove`, `TodayPage`, `ShoppingPage`.

- [ ] 写 service 失败测试，覆盖 CRUD、持久化、排序及空输入拒绝。
- [ ] 实现 Dexie service 和 live query hooks；再运行 service 测试。
- [ ] 写页面失败测试，覆盖表单保存、编辑、完成/已买、删除确认和空状态。
- [ ] 实现今日聚合页、购物页与上下文 FAB；运行相关测试。
- [ ] 提交 `feat: add today todos and shopping`。

### Task 6: 倒数日、农历和周期

**Files:** Create `src/services/calendar.ts`, `src/features/countdowns/*`, `src/features/periods/*`, tests.

**Interfaces:** Produces `resolveCountdownDate(event,year)`, `daysFromToday()`, `periodLengthInclusive()`, countdown/period services and pages.

- [ ] 写日期失败测试：公历未来/过去、每年重复、闰年、农历闰月、无效日期回退、周期首尾包含。
- [ ] 实现纯日期函数和农历适配器；运行日期测试。
- [ ] 写并实现倒数日时间轴、足迹卡片、周期历史 CRUD 页面测试。
- [ ] 提交 `feat: add countdowns lunar dates and periods`。

### Task 7: 宠物与本地图片

**Files:** Create `src/services/media.ts`, `src/features/pets/*`, tests.

**Interfaces:** Produces `compressImage(file): Promise<MediaRecord>`, `mediaService.removeOrphans()`, pet/profile/record services.

- [ ] 写失败测试覆盖图片类型/大小校验、压缩元数据、删除宠物级联记录与孤儿媒体清理。
- [ ] 使用 Canvas/Blob 实现图片压缩和 IndexedDB media 存储；实现成长、体重、健康三类记录。
- [ ] 实现宠物资料与照片时间轴页面，测试创建、筛选、编辑、删除。
- [ ] 提交 `feat: add pet timeline and media storage`。

### Task 8: 密码箱

**Files:** Create `src/services/crypto.ts`, `src/features/vault/*`, tests.

**Interfaces:** Produces `deriveVaultKey`, `encryptVaultPayload`, `decryptVaultPayload`, `vaultService.initialize/unlock/create/update/remove/clear`.

- [ ] 写固定向量测试覆盖 PBKDF2、AES-GCM 随机 IV、错误密码、篡改密文和内存锁定。
- [ ] 实现 Web Crypto 服务；持久层只保存盐、验证包、密文、IV 与非敏感时间戳。
- [ ] 实现设置主密码、解锁、自动锁定、凭据 CRUD、复制反馈和清空流程。
- [ ] 运行测试并检查 DOM/日志不出现明文凭据。
- [ ] 提交 `feat: add encrypted local vault`。

### Task 9: 日记与关系记录

**Files:** Create `src/features/diaries/*`, `src/features/relationships/*`, tests.

**Interfaces:** Produces diary/relationship services and pages; consumes media service.

- [ ] 写失败测试覆盖日记多图、心情筛选、人物筛选、感动/复盘类型和级联媒体清理。
- [ ] 实现 service、编辑表单、筛选条、日记卡片和关系时间轴。
- [ ] 运行相关单元和组件测试。
- [ ] 提交 `feat: add diaries and relationship memories`。

### Task 10: 小账核心与自动识别扩展点

**Files:** Create `src/features/ledger/models.ts`, `transactionService.ts`, `accountService.ts`, `categoryService.ts`, `budgetService.ts`, `analytics.ts`, `importAdapter.ts`, pages and tests.

**Interfaces:** Produces `TransactionImportAdapter.detect/parse`, `CandidateTransaction`, transaction/account/budget/category services, `calculateBalances`, `aggregateMonthly`.

- [ ] 写失败测试覆盖收入、支出、配对转账、编辑/删除事务、余额、分类统计、预算和去重键。
- [ ] 定义交易来源和候选状态字段，实现手工适配器、正式入账事务及可迁移 schema。
- [ ] 实现首页、账单、资产、分析、分类、预算与“自动识别尚未启用”的导入说明页；说明页只解释扩展能力，不生成交易。
- [ ] 运行 ledger 全套测试。
- [ ] 提交 `feat: add extensible local ledger`。

### Task 11: 备份、恢复、资料与设置

**Files:** Create `src/services/backup.ts`, `src/features/profile/*`, `src/features/settings/*`, tests.

**Interfaces:** Produces `exportBackup(db)`, `previewImport(file)`, `restoreBackup(db,mode)` with `replace|merge`.

- [ ] 写失败测试覆盖 schema 校验、校验和、含 Blob 的往返、覆盖、按 updatedAt 合并、损坏文件拒绝和密码箱密文保持。
- [ ] 实现版本化备份包、导出下载、导入预检与单事务恢复。
- [ ] 实现个人资料、存储用量、备份提醒和数据管理页。
- [ ] 运行备份测试并进行一次真实导出/清库/恢复流程。
- [ ] 提交 `feat: add local backup and data management`。

### Task 12: PWA、安装门与离线升级

**Files:** Modify `vite.config.ts`, `index.html`; Create `public/icons/*`, `src/app/InstallGate.tsx`, `src/app/UpdatePrompt.tsx`, tests.

**Interfaces:** Produces manifest, generated service worker, standalone detection and controlled update prompt.

- [ ] 写失败测试验证 Safari 安装说明、standalone 隐藏安装门、更新不强制刷新。
- [ ] 配置固定 manifest id、standalone、主题色、iOS meta、全尺寸图标和应用壳预缓存。
- [ ] 生成生产构建，验证 manifest、图标和 service-worker 文件存在且用户数据不进入缓存。
- [ ] 提交 `feat: make Titia installable and offline-first`。

### Task 13: 端到端验收、性能与发布

**Files:** Create `playwright.config.ts`, `e2e/core-flows.spec.ts`, `e2e/offline.spec.ts`, `README.md`; create hosting configuration required by selected provider.

**Interfaces:** Consumes the complete production app; produces deployable `dist` and a stable HTTPS URL.

- [ ] 写 E2E 场景：五栏导航；各域新增/编辑/删除；重载持久化；密码箱重锁；备份恢复；离线重启。
- [ ] 运行 `pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm test:e2e`，任何失败先修复再重跑。
- [ ] 检查 390x844、430x932、768x1024 视口，无横向溢出、遮挡或安全区冲突；检查空状态无 mock 数据。
- [ ] 审计生产构建体积、Service Worker、Manifest、图标、控制台错误和 IndexedDB 持久化。
- [ ] 发布到固定 HTTPS origin，线上重复执行安装、离线、CRUD 和备份冒烟测试。
- [ ] 提交 `release: ship Titia PWA`。
