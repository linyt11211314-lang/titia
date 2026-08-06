import { describe, expect, it } from "vitest";
import { detectBillSource } from "./sourceRules";

describe("detectBillSource", () => {
  it.each([
    ["微信支付 商户消费 付款金额", "wechat", "微信支付"],
    ["支付宝 花呗 支付成功", "alipay", "支付宝"],
    ["招商银行信用卡 消费金额", "cmb", "招商银行"],
    ["兴业银行 入账金额", "cib", "兴业银行"],
    ["光大银行 尾号1234", "ceb", "光大银行"],
    ["淘宝订单 实付款", "taobao", "支付宝"],
    ["京东 商品金额", "jd", "京东支付"],
    ["拼多多 支付成功", "pinduoduo", "微信支付"],
    ["1688采购订单", "1688", "支付宝"],
    ["美团外卖 配送费", "meituan", "美团"],
    ["饿了么 实付金额", "eleme", "支付宝"],
    ["滴滴出行 行程账单", "didi", "滴滴"],
    ["高德打车 行程费用", "amap", "高德"],
    ["地铁乘车码 扣款金额", "metro", "交通卡"],
  ])("recognizes %s", (text, provider, accountHint) => {
    expect(detectBillSource(text)).toEqual(expect.objectContaining({ provider, accountHint }));
  });
});
