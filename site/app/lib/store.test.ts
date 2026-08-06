import { beforeEach, describe, expect, it } from "vitest";
import { TitiaStore, emptyData, type Transaction } from "./store";

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
});
