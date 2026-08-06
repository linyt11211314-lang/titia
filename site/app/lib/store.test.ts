import { beforeEach, describe, expect, it } from "vitest";
import { TitiaStore, emptyData, normalizeAppData, type Transaction } from "./store";
import type { MigrationBundle } from "./migration";

describe("TitiaStore", () => {
  beforeEach(() => indexedDB.deleteDatabase("titia-test"));

  it("persists a record across store instances", async () => {
    const first = new TitiaStore("titia-test");
    await first.save({ ...emptyData(), todos: [{ id: "1", text: "写日记", done: false, createdAt: "2026-08-06" }] });
    first.close();
    const second = new TitiaStore("titia-test");
    expect((await second.load()).todos[0]?.text).toBe("写日记");
    second.close();
  });

  it("calculates account balance from confirmed transactions", () => {
    const transactions: Transaction[] = [
      { id: "1", type: "income", amount: 100, category: "工资", accountId: "cash", date: "2026-08-06", note: "", source: "manual", reviewStatus: "confirmed", createdAt: "", updatedAt: "" },
      { id: "2", type: "expense", amount: 35, category: "餐饮", accountId: "cash", date: "2026-08-06", note: "", source: "manual", reviewStatus: "confirmed", createdAt: "", updatedAt: "" },
    ];
    expect(TitiaStore.balance(transactions)).toBe(65);
  });

  it("does not include candidate transactions in an account balance", () => {
    const transactions: Transaction[] = [
      { id: "candidate", type: "expense", amount: 35.8, category: "餐饮", accountId: "cash", date: "2026-08-06", note: "", source: "ocr", reviewStatus: "candidate", createdAt: "", updatedAt: "" },
    ];
    expect(TitiaStore.balance(transactions, 100)).toBe(100);
  });

  it("exports and restores a versioned backup", async () => {
    const store = new TitiaStore("titia-test");
    await store.save({ ...emptyData(), shopping: [{ id: "s1", text: "猫砂", bought: false, createdAt: "" }] });
    const backup = await store.export();
    await store.save(emptyData());
    await store.restore(backup);
    expect((await store.load()).shopping[0]?.text).toBe("猫砂");
  });

  it("migrates V1 into the user-provided category taxonomy", () => {
    const legacy = { ...emptyData(), version: 1, categories: ["餐饮", "购物"] };
    delete (legacy as Partial<typeof legacy>).ledgerCategories;
    delete (legacy as Partial<typeof legacy>).preferences;
    delete (legacy as Partial<typeof legacy>).backupMeta;

    const migrated = normalizeAppData(legacy);

    expect(migrated.version).toBe(3);
    const parents = migrated.ledgerCategories.filter((category) => !category.parentId);
    expect(parents).toHaveLength(12);
    expect(parents.find((category) => category.name === "收入")?.type).toBe("income");
    const dining = parents.find((category) => category.name === "餐饮");
    expect(migrated.ledgerCategories).toContainEqual(expect.objectContaining({ name: "早餐", type: "expense", parentId: dining?.id }));
    expect(migrated.preferences.sparkFab.opacity).toBe(0.8);
    expect(migrated.userPreferences.floatingButton.opacity).toBe(0.8);
  });

  it("persists V2 interface preferences", async () => {
    const store = new TitiaStore("titia-test");
    const data = emptyData();
    data.preferences.sparkFab = { x: 42, y: 180, opacity: 0.4 };
    const legacyV2 = { ...data } as Partial<typeof data>;
    delete legacyV2.userPreferences;
    await store.save(legacyV2 as typeof data);

    expect((await store.load()).preferences.sparkFab).toEqual({ x: 42, y: 180, opacity: 0.4 });
    expect((await store.load()).userPreferences.floatingButton).toEqual({ x: 42, y: 180, opacity: 0.4 });
  });

  it("upgrades the old seventy-percent default to the V1.2 eighty-percent default", () => {
    const legacy = emptyData();
    delete (legacy as Partial<typeof legacy>).userPreferences;
    legacy.preferences.sparkFab.opacity = 0.7;
    expect(normalizeAppData(legacy).userPreferences.floatingButton.opacity).toBe(0.8);
  });

  it("normalizes V2 transactions into the V3 shape without losing values", () => {
    const legacy = emptyData();
    legacy.transactions = [{ id: "old", type: "expense", amount: 80, category: "购物", accountId: "cash", date: "2026-08-06", note: "淘宝", source: "ocr", confidence: 0.8, reviewStatus: "confirmed", createdAt: "a", updatedAt: "b" }];
    const migrated = normalizeAppData({ ...legacy, version: 2 });
    expect(migrated.version).toBe(3);
    expect(migrated.transactions[0]).toEqual(expect.objectContaining({ id: "old", amount: 80, merchant: "", subcategory: "", sourceProvider: "" }));
  });

  it("creates a pre-import snapshot and merges records by ID transactionally", async () => {
    const store = new TitiaStore("titia-test");
    const current = { ...emptyData(), diaries: [{ id: "same", title: "当前", body: "不能覆盖", mood: "", date: "2026-08-06" }] };
    await store.save(current);
    const incoming: MigrationBundle = { version: 1, createdAt: "2026-08-06", data: { ...emptyData(), diaries: [{ id: "same", title: "旧", body: "旧内容", mood: "", date: "2026-08-05" }, { id: "new", title: "新增", body: "内容", mood: "", date: "2026-08-05" }] }, attachments: [] };

    const result = await store.mergeBundle(incoming, "导入前自动备份");
    expect(result.added).toBe(1);
    expect((await store.load()).diaries.find((item) => item.id === "same")?.body).toBe("不能覆盖");
    expect((await store.load()).diaries).toHaveLength(2);
    const snapshots = await store.listRestoreSnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].reason).toBe("before-import");

    await store.restoreSnapshot(snapshots[0].id);
    expect((await store.load()).diaries).toEqual(current.diaries);
    store.close();
  });
});
