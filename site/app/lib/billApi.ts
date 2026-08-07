import type { BillApiConfig } from "./store";

export type ApiBill = { date?: string; type?: "income" | "expense"; amount: number; merchant?: string; category?: string; subcategory?: string; account?: string; note?: string };
type FetchLike = typeof fetch;

function chatEndpoint(value: string) {
  const endpoint = value.trim().replace(/\/$/, "");
  if (!/^https:\/\//i.test(endpoint)) throw new Error("API 地址必须使用 HTTPS");
  return /\/chat\/completions$/i.test(endpoint) ? endpoint : `${endpoint}/chat/completions`;
}

function extractJson(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? value;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("API 未返回 JSON");
  return JSON.parse(fenced.slice(start, end + 1));
}

export async function recognizeBillsWithApi(config: BillApiConfig, text: string, fetcher: FetchLike = fetch): Promise<ApiBill[]> {
  if (!config.enabled || !config.endpoint || !config.model || !config.apiKey) throw new Error("请先完整配置并启用 API");
  const response = await fetcher(chatEndpoint(config.endpoint), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "你是账单解析器。只返回JSON对象：{bills:[{date,type,amount,merchant,category,subcategory,account,note}]}。不确定字段留空；amount必须是实际支付金额，排除优惠、红包、余额；支持多笔订单。" },
        { role: "user", content: text },
      ],
    }),
  });
  if (!response.ok) throw new Error(`API 请求失败（${response.status}）`);
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const bills = extractJson(typeof content === "string" ? content : JSON.stringify(content ?? {}))?.bills;
  if (!Array.isArray(bills)) throw new Error("API 返回格式不正确");
  return bills.filter((bill: ApiBill) => Number(bill?.amount) > 0).map((bill: ApiBill) => ({ ...bill, amount: Number(bill.amount), type: bill.type === "income" ? "income" : "expense" }));
}

export function apiBillsToText(bills: ApiBill[]) {
  return bills.map((bill) => [bill.date, bill.merchant && `商户：${bill.merchant}`, `${bill.type === "income" ? "收入" : "实付款"}：${bill.amount}元`, bill.category && `分类：${bill.category}`, bill.subcategory && `二级分类：${bill.subcategory}`, bill.account && `账户：${bill.account}`, bill.note].filter(Boolean).join("\n")).join("\n\n");
}

export async function testBillApi(config: BillApiConfig, fetcher: FetchLike = fetch) {
  const bills = await recognizeBillsWithApi(config, "测试账单：2026-08-07 实付款1元 商户Titia测试", fetcher);
  return bills.length > 0;
}
