# Titia 数据迁移与灵光悬浮入口 V1.2 设计

## 目标与边界

在现有 Titia PWA、IndexedDB 数据层和视觉体系上增量增加本地数据迁移系统，并完善灵光一闪悬浮入口。页面结构、现有字段、天空背景、圆角卡片与底部导航保持不变。所有迁移数据只在浏览器本地序列化、压缩、加密和恢复，不上传到服务器。

同时兼容用户提供的旧版 `titia-backup-2026-08-06.json`。旧版表数据先转换为当前 AppData V3，再按 ID 合并，绝不直接覆盖当前数据。

## 方案选择

### 采用：自包含加密 Fragment

迁移包使用浏览器 Web Crypto 生成随机 AES-GCM 密钥，对 gzip 压缩后的完整备份加密。密钥、IV、密文和版本封装为 base64url 字符串，仅放入 `/import#...`。Fragment 不进入 HTTP 请求和服务器日志；拥有完整链接的人可恢复数据，因此界面会提示用户把链接视作私人备份。

不采用服务器中转，因为会违背纯本地和禁止上传要求；不采用账号同步，因为项目明确无用户体系。

二维码承载同一个迁移链接。标准二维码容量远小于包含图片的多 MB 备份，因此仅在编码器确认链接可容纳时生成二维码。超限时保留完整复制链接和高级 JSON 恢复，并明确提示，禁止静默移除图片或敏感数据。

## 数据组件

- `legacyBackup.ts`：识别旧版 `tables` 备份，映射 records、media、pets、petHealth、todos、shopping、countdownEvents、transactions、accounts、categories、budgets、settings 和 vault 数据。
- `migration.ts`：构建完整迁移包、gzip 压缩、AES-GCM 加解密、base64url 编码、Fragment 解析、内容统计和按 ID 合并。
- `restoreHistory`：在 IndexedDB 中保存导入前快照的元数据及完整备份，允许用户从“恢复记录”回滚。
- `DataManagement`：位于“我呀 → 设置 → 数据管理”，提供一键迁移、高级导出/恢复、迁移预览、二维码和恢复记录。
- `SparkFloatingButton`：负责长按、拖动、安全区约束、释放吸边、透明度设置和保存。

## 数据流

### 旧版 JSON 导入

1. 本地读取文件并识别 `version: 1`、`tables`。
2. 生成转换预览，仅展示各类数量。
3. 用户确认后，在 IndexedDB 创建导入前快照。
4. 将旧数据转换为 AppData V3；媒体转换为 data URL 图片字段，账单及账户保留原 ID。
5. 逐集合按 ID 合并；已有 ID 跳过，不覆盖。
6. 保存到当前 `state`，刷新后仍存在。

### 一键迁移

1. 从 IndexedDB 读取 AppData、交易附件和恢复所需图片。
2. JSON 序列化后 gzip 压缩。
3. 使用随机 AES-GCM 密钥加密并封装版本包。
4. 生成 `${origin}${basePath}import#<encryptedData>`。
5. 新设备打开后只在本地解密，显示统计预览。
6. 确认时先保存当前数据快照，再按 ID 合并并保存附件。
7. 成功后移除地址栏 Fragment，防止后续误触发。

### 灵光入口

默认透明度为 80%。长按 1 秒进入编辑状态；编辑状态下拖动，坐标限制在左右安全边距、顶部安全区与底部导航之上。释放时吸附至最近左右边缘。保存后写入 `preferences.floatingButton`，同时兼容原有 `preferences.sparkFab`。普通点击继续打开灵光一闪表单。

## 数据结构

AppData 版本保持 V3，新增兼容字段：

```ts
preferences: {
  sparkFab: SparkFabPreference;
  floatingButton: { x: number | null; y: number | null; opacity: number };
}
```

Dexie 新增：

```ts
type RestoreSnapshot = {
  id: string;
  createdAt: string;
  reason: "before-import" | "manual";
  label: string;
  payload: string;
  counts: MigrationCounts;
};
```

迁移包包含 AppData、交易附件和包版本，不删除或重命名已有字段。

## 安全与错误处理

- 不调用上传 API，不把迁移内容写入查询参数。
- 解密失败、版本不支持、数据损坏或空间不足时停止导入，当前数据保持不变。
- 导入合并在 Dexie 事务内完成；任何一步失败均回滚。
- 密码箱密文按原样迁移，不在预览或日志显示明文。
- 导入前快照至少保留最近 10 条，超出后仅删除最旧快照。
- 迁移链接可能很长，复制失败时提示使用高级恢复。

## 测试

- 旧版备份识别、字段转换和各集合数量。
- gzip/AES-GCM 往返、篡改拒绝、Fragment 不使用查询参数。
- 所有集合和附件按 ID 合并，重复 ID 跳过。
- 导入前快照创建、回滚和刷新后持久化。
- 迁移预览数量正确。
- FAB 长按、拖动、边界、吸边、默认 80%、保存后恢复。
- 全量 Vitest、ESLint、生产构建和 GitHub Pages 线上检查。
