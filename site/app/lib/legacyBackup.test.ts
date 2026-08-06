import { describe, expect, it } from "vitest";
import { convertLegacyBackup, isLegacyBackup } from "./legacyBackup";

const backup = {
  version: 1,
  exportedAt: 1786003728383,
  tables: {
    records: [
      { id: "d1", type: "diary", occurredAt: 1786000000000, content: "今天很好", mediaIds: ["m1"], payload: { mood: "😊" } },
      { id: "s1", type: "spark", occurredAt: 1786000000000, content: "做一个迁移页", payload: { category: "产品" } },
      { id: "r1", type: "relation_touched", occurredAt: 1786000000000, content: "记得我的小事", payload: { person: "家人", event: "惊喜", whyMoved: "用心" } },
      { id: "pm1", type: "pet_moment", occurredAt: 1786000000000, content: "长大啦", refType: "p1", payload: {} },
    ],
    media: [{ id: "m1", blob: "data:image/jpeg;base64,AA==", mime: "image/jpeg" }],
    pets: [{ id: "p1", name: "憨憨", breed: "狸花", gender: "男孩", birthday: "2019-11-08" }],
    petHealth: [{ id: "ph1", petId: "p1", kind: "weight", value: "5.2", date: "2026-08-06" }],
    todos: [{ id: "t1", title: "整理资料", done: false, createdAt: 1786000000000 }],
    shopping: [{ id: "sh1", name: "猫砂", bought: true, createdAt: 1786000000000 }],
    countdownEvents: [{ id: "c1", title: "生日", solarDate: "2026-10-06", category: "生日", dateType: "solar" }],
    accounts: [{ id: "a1", name: "微信", kind: "电子账户" }],
    transactions: [{ id: "tx1", txType: "expense", amount: 35.8, category: "餐饮", account: "a1", time: "2026-08-06T12:30:00.000Z", note: "午餐" }],
    categories: [{ id: "cat1", name: "餐饮", side: "expense" }],
    budgets: [{ id: "b1", category: "餐饮", amount: 1300, period: "2026-08" }],
    cycles: [{ id: "cy1", startDate: "2026-07-18", endDate: "2026-07-22" }],
    vaultMeta: [{ id: "main", salt: "salt", verifier: "cipher", verifierIv: "iv" }],
    vaultItems: [{ id: "v1", name: "站点", secret: "ciphertext", iv: "iv", createdAt: 1786000000000 }],
    settings: [], people: [], financeItems: [], rules: [],
  },
};

describe("legacy backup adapter", () => {
  it("recognizes the exported table format", () => {
    expect(isLegacyBackup(backup)).toBe(true);
    expect(isLegacyBackup({ app: "titia", data: {} })).toBe(false);
  });

  it("preserves IDs while mapping all user-facing records", () => {
    const result = convertLegacyBackup(backup);
    expect(result.mediaCount).toBe(1);
    expect(result.data.diaries).toEqual([expect.objectContaining({ id: "d1", body: "今天很好", image: "data:image/jpeg;base64,AA==" })]);
    expect(result.data.sparks).toEqual([expect.objectContaining({ id: "s1", tag: "产品" })]);
    expect(result.data.relationships).toEqual([expect.objectContaining({ id: "r1", person: "家人" })]);
    expect(result.data.petRecords).toHaveLength(2);
    expect(result.data.todos[0]).toEqual(expect.objectContaining({ id: "t1", text: "整理资料" }));
    expect(result.data.shopping[0]).toEqual(expect.objectContaining({ id: "sh1", bought: true }));
    expect(result.data.countdowns[0]).toEqual(expect.objectContaining({ id: "c1", date: "2026-10-06" }));
    expect(result.data.transactions[0]).toEqual(expect.objectContaining({ id: "tx1", amount: 35.8, accountId: "a1", reviewStatus: "confirmed" }));
    expect(result.data.accounts[0]).toEqual(expect.objectContaining({ id: "a1", name: "微信" }));
    expect(result.data.budgets[0]).toEqual(expect.objectContaining({ id: "b1", month: "2026-08" }));
    expect(result.data.periods[0]).toEqual(expect.objectContaining({ id: "cy1", start: "2026-07-18" }));
    expect(result.data.vault[0]).toEqual(expect.objectContaining({ id: "v1", ciphertext: "ciphertext" }));
  });

  it("ignores deleted rows instead of reviving them", () => {
    const deleted = structuredClone(backup);
    deleted.tables.todos[0].deletedAt = 1786000000000;
    expect(convertLegacyBackup(deleted).data.todos).toHaveLength(0);
  });
});
