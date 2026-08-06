# Titia 时序

一款温柔、私密、离线优先的个人生活操作系统。正式入口为 iOS/iPadOS 17+ 主屏幕 PWA，业务数据仅保存在当前 PWA 的 IndexedDB 中。

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

数据不会上传到服务器。请在“我呀 → 数据管理”中定期导出备份。
