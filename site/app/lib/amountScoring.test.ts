import { describe, expect, it } from "vitest";
import { scoreAmountCandidates } from "./amountScoring";

describe("scoreAmountCandidates", () => {
  it("prefers actual payment and excludes discounts", () => {
    const result = scoreAmountCandidates("商品金额 100元\n优惠金额 20元\n实付款 ¥80.00");
    expect(result.candidates[0]).toEqual(expect.objectContaining({ amount: 80, excluded: false }));
    expect(result.candidates.find((item) => item.amount === 20)?.excluded).toBe(true);
    expect(result.ambiguous).toBe(false);
  });

  it("excludes balances and total assets", () => {
    const result = scoreAmountCandidates("付款金额 35.80\n账户余额 2035.80\n总资产 9999");
    expect(result.candidates[0].amount).toBe(35.8);
    expect(result.candidates.filter((item) => item.amount > 1000).every((item) => item.excluded)).toBe(true);
  });

  it("requires a choice when two plausible payment values are close", () => {
    const result = scoreAmountCandidates("支付金额 80元\n付款金额 100元");
    expect(result.ambiguous).toBe(true);
    expect(result.candidates.filter((item) => !item.excluded)).toHaveLength(2);
  });
});
