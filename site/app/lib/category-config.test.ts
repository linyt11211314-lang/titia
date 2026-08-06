import { describe, expect, it } from "vitest";
import { defaultLedgerCategories } from "./category-config";

describe("user category taxonomy", () => {
  it("contains the twelve documented parent categories and their leaf entries", () => {
    const parents = defaultLedgerCategories.filter((category) => !category.parentId);
    expect(parents.map((category) => category.name)).toEqual([
      "收入", "餐饮", "购物", "住房生活", "交通出行", "宠物", "医疗健康", "娱乐休闲", "学习成长", "人情关系", "金融转账", "其他",
    ]);
    const income = parents.find((category) => category.name === "收入");
    const pet = parents.find((category) => category.name === "宠物");
    expect(defaultLedgerCategories).toContainEqual(expect.objectContaining({ name: "亚马逊收入", type: "income", parentId: income?.id }));
    expect(defaultLedgerCategories).toContainEqual(expect.objectContaining({ name: "猫粮", type: "expense", parentId: pet?.id }));
  });
});
