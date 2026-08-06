import { describe, expect, it } from "vitest";
import { classifyBill } from "./categoryRules";
import type { Transaction } from "./store";

describe("classifyBill", () => {
  it.each([
    ["麦当劳 工作日午餐", "餐饮", "午餐"],
    ["瑞幸咖啡", "餐饮", "奶茶饮品"],
    ["美团外卖 汉堡", "餐饮", "外卖"],
    ["淘宝购买连衣裙", "购物", "服饰"],
    ["京东购买手机", "购物", "数码"],
    ["猫砂宠物店", "宠物", "猫砂"],
    ["宠物医院检查", "宠物", "宠物医疗"],
    ["滴滴出行", "交通出行", "打车"],
    ["医院挂号检查", "医疗健康", "检查"],
    ["本月工资到账", "收入", "工资"],
    ["退款到账", "收入", "退款"],
  ])("classifies %s", (text, category, subcategory) => {
    expect(classifyBill({ text, merchant: "", provider: "" }, [])).toEqual(expect.objectContaining({ category, subcategory }));
  });

  it("uses product before merchant, platform, and history", () => {
    expect(classifyBill({ text: "猫粮", merchant: "麦当劳", provider: "taobao" }, [])).toEqual(expect.objectContaining({ category: "宠物", subcategory: "猫粮", matchedBy: "product" }));
  });

  it("uses confirmed merchant history after static rules", () => {
    const history: Transaction[] = [{ id: "1", amount: 10, type: "expense", category: "娱乐休闲", subcategory: "电影", merchant: "小城影院", accountId: "cash", date: "2026-08-01", note: "", source: "manual", reviewStatus: "confirmed", createdAt: "", updatedAt: "" }];
    expect(classifyBill({ text: "小城影院", merchant: "小城影院", provider: "" }, history)).toEqual(expect.objectContaining({ category: "娱乐休闲", subcategory: "电影", matchedBy: "history" }));
  });
});
