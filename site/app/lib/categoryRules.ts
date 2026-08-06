import type { Transaction } from "./store";

type MatchInput = { text: string; merchant: string; provider: string };
export type Classification = { category: string; subcategory: string; confidence: number; matchedBy: "product" | "merchant" | "platform" | "history" | "none" };

type Rule = { keywords: string[]; category: string; subcategory: string };
const productRules: Rule[] = [
  { keywords: ["猫粮"], category: "宠物", subcategory: "猫粮" },
  { keywords: ["猫砂"], category: "宠物", subcategory: "猫砂" },
  { keywords: ["宠物医院", "宠物医疗"], category: "宠物", subcategory: "宠物医疗" },
  { keywords: ["手机", "电脑", "耳机", "数码"], category: "购物", subcategory: "数码" },
  { keywords: ["连衣裙", "衣服", "服饰", "鞋子"], category: "购物", subcategory: "服饰" },
  { keywords: ["医院", "挂号", "检查"], category: "医疗健康", subcategory: "检查" },
  { keywords: ["药房", "药品"], category: "医疗健康", subcategory: "药品" },
  { keywords: ["工资"], category: "收入", subcategory: "工资" },
  { keywords: ["奖金"], category: "收入", subcategory: "奖金" },
  { keywords: ["提成"], category: "收入", subcategory: "提成" },
  { keywords: ["退款"], category: "收入", subcategory: "退款" },
  { keywords: ["麦当劳", "肯德基", "午餐"], category: "餐饮", subcategory: "午餐" },
  { keywords: ["瑞幸", "星巴克", "奶茶", "咖啡"], category: "餐饮", subcategory: "奶茶饮品" },
];
const merchantRules: Rule[] = [
  { keywords: ["麦当劳", "肯德基"], category: "餐饮", subcategory: "午餐" },
  { keywords: ["瑞幸", "星巴克"], category: "餐饮", subcategory: "奶茶饮品" },
  { keywords: ["宠物店"], category: "宠物", subcategory: "宠物用品" },
];
const platformRules: Array<Rule & { providers: string[] }> = [
  { providers: ["meituan", "eleme"], keywords: ["美团", "饿了么"], category: "餐饮", subcategory: "外卖" },
  { providers: ["didi", "amap"], keywords: ["滴滴", "高德"], category: "交通出行", subcategory: "打车" },
  { providers: ["metro"], keywords: ["地铁"], category: "交通出行", subcategory: "地铁" },
  { providers: ["taobao", "jd", "pinduoduo", "1688"], keywords: ["淘宝", "京东", "拼多多", "1688"], category: "购物", subcategory: "日用品" },
];

const match = (text: string, rules: Rule[]) => rules.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));

export function classifyBill(input: MatchInput, history: Transaction[]): Classification {
  const product = match(input.text, productRules);
  if (product) return { category: product.category, subcategory: product.subcategory, confidence: 0.94, matchedBy: "product" };
  const merchant = match(input.merchant, merchantRules);
  if (merchant) return { category: merchant.category, subcategory: merchant.subcategory, confidence: 0.88, matchedBy: "merchant" };
  const platform = platformRules.find((rule) => rule.providers.includes(input.provider) || rule.keywords.some((keyword) => input.text.includes(keyword)));
  if (platform) return { category: platform.category, subcategory: platform.subcategory, confidence: 0.72, matchedBy: "platform" };
  const previous = history.find((transaction) => transaction.reviewStatus === "confirmed" && transaction.merchant && transaction.merchant === input.merchant);
  if (previous) return { category: previous.category, subcategory: previous.subcategory ?? "", confidence: 0.7, matchedBy: "history" };
  return { category: "未分类", subcategory: "", confidence: 0.2, matchedBy: "none" };
}
