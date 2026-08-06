import { describe, expect, it } from "vitest";
import { analysisSummary, assetSummary, categorySummary, dataSummary, ledgerSummary, parseOcrText, parseTransactionRows } from "./ledger";
import { emptyData, type Transaction } from "./store";

const transaction = (partial: Partial<Transaction>): Transaction => ({
  id: partial.id ?? crypto.randomUUID(),
  type: partial.type ?? "expense",
  amount: partial.amount ?? 0,
  category: partial.category ?? "餐饮",
  accountId: partial.accountId ?? "cash",
  date: partial.date ?? "2026-08-06",
  note: partial.note ?? "",
  source: partial.source ?? "manual",
  reviewStatus: partial.reviewStatus ?? "confirmed",
  createdAt: partial.createdAt ?? "2026-08-06T00:00:00.000Z",
  updatedAt: partial.updatedAt ?? "2026-08-06T00:00:00.000Z",
});

describe("ledger summaries", () => {
  it("calculates the current month bill overview from confirmed transactions", () => {
    const data = emptyData();
    data.transactions = [
      transaction({ type: "expense", amount: 80, date: "2026-08-02" }),
      transaction({ type: "income", amount: 200, date: "2026-08-03", category: "工资" }),
      transaction({ type: "expense", amount: 30, date: "2026-07-31" }),
      transaction({ type: "expense", amount: 99, reviewStatus: "candidate" }),
    ];

    expect(ledgerSummary(data, "2026-08")).toEqual({ expense: 80, income: 200, balance: 120, count: 2 });
  });

  it("separates assets and liabilities", () => {
    const data = emptyData();
    data.accounts = [
      { id: "cash", name: "现金", opening: 1000, kind: "现金" },
      { id: "card", name: "信用卡", opening: 300, kind: "负债" },
    ];
    data.transactions = [transaction({ accountId: "cash", type: "expense", amount: 100 })];

    expect(assetSummary(data)).toEqual({ assets: 900, liabilities: 300, net: 600, accountCount: 2 });
  });

  it("calculates analysis and category statistics", () => {
    const data = emptyData();
    data.transactions = [
      transaction({ amount: 120, category: "餐饮", date: "2026-08-01" }),
      transaction({ amount: 30, category: "购物", date: "2026-08-02" }),
      transaction({ amount: 100, category: "餐饮", date: "2026-07-02" }),
    ];
    data.ledgerCategories.push({ id: "salary", name: "工资", type: "income" });

    expect(analysisSummary(data, "2026-08")).toEqual({ spending: 150, topCategory: "餐饮", count: 2, monthOverMonth: 50 });
    expect(categorySummary(data, "2026-08")).toEqual({ expenseCount: 101, incomeCount: 9, topCategory: "餐饮" });
    expect(dataSummary(data).total).toBeGreaterThan(3);
  });
});

describe("transaction row parsing", () => {
  it("recognizes Chinese fields and previews valid rows", () => {
    const result = parseTransactionRows([
      { 日期: "2026/08/05", 金额: "¥12.50", 收入支出: "支出", 分类: "餐饮", 账户: "现金账户", 备注: "午餐" },
      { 日期: "2026-08-06", 金额: 100, 收入支出: "收入", 分类: "工资", 账户: "现金账户" },
      { 日期: "bad", 金额: "x" },
    ], emptyData());

    expect(result.summary).toEqual({ total: 2, income: 1, expense: 1, errors: 1 });
    expect(result.transactions[0]).toMatchObject({ date: "2026-08-05", amount: 12.5, type: "expense", category: "餐饮", accountId: "cash", source: "import", reviewStatus: "candidate" });
  });

  it("turns local OCR text into reviewable candidate bills", () => {
    const result = parseOcrText("2026-08-06 支出 35.80 餐饮 现金账户 午餐", emptyData());
    expect(result.transactions[0]).toMatchObject({ date: "2026-08-06", amount: 35.8, type: "expense", category: "餐饮", accountId: "cash", note: "午餐", source: "ocr", reviewStatus: "candidate" });
  });
});
