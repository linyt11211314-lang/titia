# Titia 时序 V2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏旧数据和现有导航的前提下完成 V2.0 生活记录、小账、迁移、主题与移动端体验。

**Architecture:** 在现有 AppData 上增加可选兼容字段，以纯函数承载金额、日期、导入和统计逻辑，以独立 React 组件承载编辑器、主题、预算、分析和图片上传。所有持久化继续经过 Dexie。

**Tech Stack:** React 19、TypeScript、Dexie、Vitest、Vite PWA、SheetJS、python-docx。

## Global Constraints

- 不重构整体架构，不修改未提及功能，不删除已有数据。
- 所有新功能接入 IndexedDB 真实数据；不使用临时 state 作为持久层。
- 保留浅蓝背景、云朵、圆角卡片、iOS 简洁风格和底部导航结构。

---

### Task 1: 数据兼容与纯函数

**Files:** `site/app/lib/store.ts`, `site/app/lib/format.ts`, `site/app/lib/countdown.ts`, `site/app/lib/ledgerAnalytics.ts` 及对应测试。

- [ ] 写入旧数据兼容、金额缩写、足迹/期待、分析范围、账户分组测试并确认失败。
- [ ] 增加可选字段、默认值和纯函数实现。
- [ ] 运行定向测试并确认通过。

### Task 2: 生活与灵光交互

**Files:** `site/app/TitiaApp.tsx`, `site/app/components/SparkFullscreen.tsx`, `site/app/components/ImagePicker.tsx` 及对应测试。

- [ ] 写入待办/购物隐藏、标题可空、灵光编辑、关系多图、密码箱自动锁定测试。
- [ ] 实现统一多图组件与真实 Blob 持久化。
- [ ] 实现新增/编辑一致的灵光弹窗与标签映射。
- [ ] 实现离开密码箱清除密钥。

### Task 3: 倒数日与周期

**Files:** `site/app/components/CountdownCenter.tsx`, `site/app/TitiaApp.tsx`, `site/app/lib/lifeDates.ts` 及对应测试。

- [ ] 写入闰日、本地时间、足迹累计、年度循环和预测日期测试。
- [ ] 实现足迹/期待分区、12 月年度总览和页面内月份详情。
- [ ] 将周期概览改为下次预测并复用现有月历。

### Task 4: 小账功能

**Files:** `site/app/components/Ledger*.tsx`, `site/app/lib/spreadsheet.ts`, `site/app/lib/ledger*.ts` 及对应测试。

- [ ] 写入模板 12 列映射、两级分类、默认账户、预算 CRUD、范围分析测试。
- [ ] 实现模板导入、预算选择卡、账户分组与默认账户。
- [ ] 实现周/月/年/自定义分析、环形占比和支出排行。
- [ ] 增加剪贴板识别入口和快捷指令指南。

### Task 5: 全局 UI、主题与图标

**Files:** `site/app/globals.css`, `site/app/mobile-fixes.css`, `site/public/manifest.webmanifest`, `site/public/icon*.png`。

- [ ] 写入固定数字、无横向滚动、安全区与主题测试。
- [ ] 应用紧凑卡片、固定槽位、统一按钮和图片网格样式。
- [ ] 增加三套 IndexedDB 主题配置与应用设置页面。
- [ ] 替换并生成 PWA/Apple 图标。

### Task 6: 架构文档与发布

**Files:** `outputs/Titia 时序架构说明文档.docx`, `site/public/sw.js`。

- [ ] 生成架构、数据模型、模块、离线、迁移、测试和维护说明。
- [ ] 渲染 DOCX 并逐页检查。
- [ ] 运行全量测试、ESLint、构建与差异检查。
- [ ] 升级缓存、提交、推送 main 并等待 GitHub Pages 成功。

