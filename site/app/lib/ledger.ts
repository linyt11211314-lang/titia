import { uid, type AppData, type Transaction } from "./store";

const confirmed = (data: AppData) => data.transactions.filter((item) => item.reviewStatus === "confirmed");
const monthItems = (data: AppData, month: string) => confirmed(data).filter((item) => item.date.startsWith(month));
const sum = (items: Transaction[]) => items.reduce((total, item) => total + item.amount, 0);

export function ledgerSummary(data: AppData, month: string) {
  const items = monthItems(data, month);
  const expense = sum(items.filter((item) => item.type === "expense"));
  const income = sum(items.filter((item) => item.type === "income"));
  return { expense, income, balance: income - expense, count: items.length };
}

export function assetSummary(data: AppData) {
  const accountBalance = (accountId: string, opening: number) => opening + confirmed(data)
    .filter((item) => item.accountId === accountId)
    .reduce((total, item) => total + (item.type === "income" ? item.amount : -item.amount), 0);
  const assets = data.accounts.filter((account) => account.kind !== "负债").reduce((total, account) => total + accountBalance(account.id, account.opening), 0);
  const liabilities = data.accounts.filter((account) => account.kind === "负债").reduce((total, account) => total + Math.abs(accountBalance(account.id, account.opening)), 0);
  return { assets, liabilities, net: assets - liabilities, accountCount: data.accounts.length };
}

const expenseByCategory = (items: Transaction[]) => items.filter((item) => item.type === "expense").reduce<Record<string, number>>((totals, item) => {
  totals[item.category] = (totals[item.category] ?? 0) + item.amount;
  return totals;
}, {});
const topCategory = (items: Transaction[]) => Object.entries(expenseByCategory(items)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "暂无";
const previousMonth = (month: string) => {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(year, index - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export function analysisSummary(data: AppData, month: string) {
  const items = monthItems(data, month).filter((item) => item.type === "expense");
  const spending = sum(items);
  const previous = sum(monthItems(data, previousMonth(month)).filter((item) => item.type === "expense"));
  const monthOverMonth = previous === 0 ? (spending === 0 ? 0 : 100) : Math.round(((spending - previous) / previous) * 100);
  return { spending, topCategory: topCategory(items), count: items.length, monthOverMonth };
}

export function categorySummary(data: AppData, month: string) {
  const items = monthItems(data, month);
  return {
    expenseCount: data.ledgerCategories.filter((item) => item.type === "expense").length,
    incomeCount: data.ledgerCategories.filter((item) => item.type === "income").length,
    topCategory: topCategory(items),
  };
}

export function dataSummary(data: AppData) {
  const total = Object.values(data).filter(Array.isArray).reduce((count, items) => count + items.length, 0);
  return { total, lastBackupAt: data.backupMeta.lastSpreadsheetExportAt, storageBytes: new TextEncoder().encode(JSON.stringify(data)).byteLength };
}

type ImportResult = { transactions: Transaction[]; summary: { total: number; income: number; expense: number; errors: number } };
const aliases = {
  date: ["日期", "date", "交易日期", "时间"], amount: ["金额", "amount", "交易金额"], type: ["收入支出", "类型", "type", "收支类型"],
  category: ["分类", "category"], account: ["账户", "account", "账号"], note: ["备注", "note", "说明"],
};
const field = (row: Record<string, unknown>, names: string[]) => names.map((name) => row[name]).find((value) => value !== undefined && value !== null && value !== "");
const normalizeDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const excel = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return excel.toISOString().slice(0, 10);
  }
  const text = String(value ?? "").trim().replace(/[/.年]/g, "-").replace(/月/g, "-").replace(/日/g, "");
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
};

export function parseTransactionRows(rows: Record<string, unknown>[], data: AppData): ImportResult {
  const transactions: Transaction[] = [];
  let errors = 0;
  for (const row of rows) {
    const date = normalizeDate(field(row, aliases.date));
    const amount = Number(String(field(row, aliases.amount) ?? "").replace(/[^\d.-]/g, ""));
    if (!date || !Number.isFinite(amount) || amount <= 0) { errors += 1; continue; }
    const rawType = String(field(row, aliases.type) ?? "支出").toLowerCase();
    const type: Transaction["type"] = /收入|income|入账/.test(rawType) ? "income" : "expense";
    const accountName = String(field(row, aliases.account) ?? "");
    const accountId = data.accounts.find((account) => account.name === accountName || account.id === accountName)?.id ?? data.accounts[0]?.id ?? "cash";
    const now = new Date().toISOString();
    transactions.push({ id: uid(), type, amount, category: String(field(row, aliases.category) ?? "未分类"), accountId, date, note: String(field(row, aliases.note) ?? ""), source: "import", reviewStatus: "candidate", createdAt: now, updatedAt: now });
  }
  return { transactions, summary: { total: transactions.length, income: transactions.filter((item) => item.type === "income").length, expense: transactions.filter((item) => item.type === "expense").length, errors } };
}

export function parseOcrText(text: string, data: AppData): ImportResult {
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const date = line.match(/\d{4}[年/.-]\d{1,2}[月/.-]\d{1,2}日?/)?.[0] ?? "";
    const withoutDate = line.replace(date, " ");
    const amount = withoutDate.match(/(?:¥|￥)?\s*\d+(?:\.\d{1,2})?/)?.[0] ?? "";
    const type = /收入|入账|income/i.test(line) ? "收入" : "支出";
    const category = [...data.ledgerCategories].sort((a, b) => b.name.length - a.name.length).find((item) => line.includes(item.name))?.name ?? "未分类";
    const account = data.accounts.find((item) => line.includes(item.name))?.name ?? data.accounts[0]?.name ?? "现金账户";
    const note = line.replace(date, " ").replace(amount, " ").replace(type, " ").replace(category, " ").replace(account, " ").replace(/\s+/g, " ").trim();
    return { 日期: date, 金额: amount, 收入支出: type, 分类: category, 账户: account, 备注: note };
  });
  const result = parseTransactionRows(rows, data);
  return { ...result, transactions: result.transactions.map((item) => ({ ...item, source: "ocr" })) };
}
