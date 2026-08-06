import { assetSummary, parseTransactionRows } from "./ledger";
import type { AppData } from "./store";

const accountName = (data: AppData, id: string) => data.accounts.find((account) => account.id === id)?.name ?? id;

export async function buildLedgerWorkbook(data: AppData): Promise<Uint8Array> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const sheets: Array<[string, Record<string, unknown>[]]> = [
    ["账单", data.transactions.map((item) => ({ 日期: item.date, 收入支出: item.type === "income" ? "收入" : "支出", 金额: item.amount, 分类: item.category, 账户: accountName(data, item.accountId), 备注: item.note, 来源: item.source, 状态: item.reviewStatus, ID: item.id }))],
    ["分类", data.ledgerCategories.map((item) => ({ ID: item.id, 类型: item.type === "income" ? "收入" : "支出", 一级分类: item.parentId ? data.ledgerCategories.find((parent) => parent.id === item.parentId)?.name ?? "" : item.name, 二级分类: item.parentId ? item.name : "", 父级ID: item.parentId ?? "" }))],
    ["账户", data.accounts.map((item) => ({ ID: item.id, 账户名称: item.name, 类型: item.kind, 期初余额: item.opening }))],
    ["预算", data.budgets.map((item) => ({ ID: item.id, 月份: item.month, 分类: item.category, 预算金额: item.amount }))],
    ["资产", data.accounts.map((item) => ({ ID: item.id, 账户名称: item.name, 类型: item.kind, 当前余额: item.opening + data.transactions.filter((transaction) => transaction.accountId === item.id && transaction.reviewStatus === "confirmed").reduce((total, transaction) => total + (transaction.type === "income" ? transaction.amount : -transaction.amount), 0) })).concat([{ ID: "summary", 账户名称: "净资产", 类型: "汇总", 当前余额: assetSummary(data).net }])],
  ];
  for (const [name, rows] of sheets) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as Uint8Array;
}

export async function parseLedgerWorkbook(input: ArrayBuffer | Uint8Array, data: AppData) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(input, { type: "array", cellDates: true });
  const billSheetName = workbook.SheetNames.includes("账单") ? "账单" : workbook.SheetNames[0];
  const rows = billSheetName ? XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[billSheetName], { defval: "" }) : [];
  return { ...parseTransactionRows(rows, data), sheetNames: workbook.SheetNames };
}

const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function buildTransactionCsv(data: AppData): string {
  const headers = ["日期", "收入支出", "金额", "分类", "账户", "备注", "来源", "状态"];
  const rows = data.transactions.map((item) => [item.date, item.type === "income" ? "收入" : "支出", item.amount, item.category, accountName(data, item.accountId), item.note, item.source, item.reviewStatus]);
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
