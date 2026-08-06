export type BillSource = { provider: string; accountHint: string; platformType: "wallet" | "bank" | "commerce" | "delivery" | "transport" | "unknown"; confidence: number };

const rules: Array<Omit<BillSource, "confidence"> & { keywords: string[] }> = [
  { provider: "cmb", accountHint: "招商银行", platformType: "bank", keywords: ["招商银行", "招行"] },
  { provider: "cib", accountHint: "兴业银行", platformType: "bank", keywords: ["兴业银行"] },
  { provider: "ceb", accountHint: "光大银行", platformType: "bank", keywords: ["光大银行"] },
  { provider: "taobao", accountHint: "支付宝", platformType: "commerce", keywords: ["淘宝", "天猫"] },
  { provider: "jd", accountHint: "京东支付", platformType: "commerce", keywords: ["京东"] },
  { provider: "pinduoduo", accountHint: "微信支付", platformType: "commerce", keywords: ["拼多多"] },
  { provider: "1688", accountHint: "支付宝", platformType: "commerce", keywords: ["1688"] },
  { provider: "meituan", accountHint: "美团", platformType: "delivery", keywords: ["美团"] },
  { provider: "eleme", accountHint: "支付宝", platformType: "delivery", keywords: ["饿了么"] },
  { provider: "didi", accountHint: "滴滴", platformType: "transport", keywords: ["滴滴"] },
  { provider: "amap", accountHint: "高德", platformType: "transport", keywords: ["高德"] },
  { provider: "metro", accountHint: "交通卡", platformType: "transport", keywords: ["地铁", "乘车码"] },
  { provider: "wechat", accountHint: "微信支付", platformType: "wallet", keywords: ["微信支付", "微信收款", "零钱"] },
  { provider: "alipay", accountHint: "支付宝", platformType: "wallet", keywords: ["支付宝", "花呗"] },
];

export function detectBillSource(text: string): BillSource {
  const found = rules.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
  return found ? { provider: found.provider, accountHint: found.accountHint, platformType: found.platformType, confidence: 0.95 } : { provider: "unknown", accountHint: "", platformType: "unknown", confidence: 0.2 };
}
