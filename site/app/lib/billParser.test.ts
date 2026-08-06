import { describe, expect, it } from "vitest";
import { emptyData } from "./store";
import { parseBillBatch, reviewDraftToTransaction } from "./billParser";

describe("parseBillBatch", () => {
  it("parses a WeChat receipt using actual payment", () => {
    const data = emptyData();
    data.accounts.push({ id: "wechat", name: "微信支付", opening: 0, kind: "电子钱包" });
    const batch = parseBillBatch({ text: "微信支付\n商户：麦当劳\n商品金额 40元\n优惠 4.20元\n实付款 35.80元\n2026-08-06 12:30", attachmentId: "image-1", data });
    expect(batch.drafts).toHaveLength(1);
    expect(batch.drafts[0]).toEqual(expect.objectContaining({ amount: 35.8, merchant: "麦当劳", accountId: "wechat", sourceProvider: "wechat", imageId: "image-1", needsAmountChoice: false }));
  });

  it("classifies an Alipay refund as income", () => {
    const batch = parseBillBatch({ text: "支付宝\n退款到账 20.00元\n商户：淘宝\n2026-08-06 18:00", data: emptyData() });
    expect(batch.drafts[0]).toEqual(expect.objectContaining({ type: "income", category: "收入", subcategory: "退款" }));
  });

  it("preserves multiple plausible amounts for an explicit choice", () => {
    const batch = parseBillBatch({ text: "微信支付\n支付金额 80元\n付款金额 100元\n2026-08-06", data: emptyData() });
    expect(batch.drafts[0].needsAmountChoice).toBe(true);
    expect(batch.drafts[0].amountCandidates.filter((item) => !item.excluded)).toHaveLength(2);
  });

  it("splits ten explicitly anchored transaction rows into ten drafts", () => {
    const text = Array.from({ length: 10 }, (_, index) => `2026-08-${String(index + 1).padStart(2, "0")} 12:00 商户：订单${index + 1} 支付金额 ${index + 1}.00元`).join("\n");
    expect(parseBillBatch({ text, data: emptyData() }).drafts).toHaveLength(10);
  });

  it("does not invent orders from weak line breaks", () => {
    const text = "微信支付\n麦当劳\n商品金额 40元\n优惠金额 4.2元\n实付款 35.8元\n支付成功";
    expect(parseBillBatch({ text, data: emptyData() }).drafts).toHaveLength(1);
  });

  it("blocks conversion when no reliable amount exists", () => {
    const draft = parseBillBatch({ text: "微信支付\n商户：麦当劳\n支付成功", data: emptyData() }).drafts[0];
    expect(draft.valid).toBe(false);
    expect(() => reviewDraftToTransaction(draft)).toThrow("金额");
  });
});
