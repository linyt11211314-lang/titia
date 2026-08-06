import { beforeEach, describe, expect, it } from "vitest";
import { TitiaStore, emptyData, normalizeAppData, type Transaction } from "./store";

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

    expect(migrated.version).toBe(2);
    const parents = migrated.ledgerCategories.filter((category) => !category.parentId);
    expect(parents).toHaveLength(12);
    expect(parents.find((category) => category.name === "收入")?.type).toBe("income");
    const dining = parents.find((category) => category.name === "餐饮");
    expect(migrated.ledgerCategories).toContainEqual(expect.objectContaining({ name: "早餐", type: "expense", parentId: dining?.id }));
    expect(migrated.preferences.sparkFab.opacity).toBe(0.7);
  });

  it("persists V2 interface preferences", async () => {
    const store = new TitiaStore("titia-test");
    const data = emptyData();
    data.preferences.sparkFab = { x: 42, y: 180, opacity: 0.4 };
    await store.save(data);

    expect((await store.load()).preferences.sparkFab).toEqual({ x: 42, y: 180, opacity: 0.4 });
  });
});
