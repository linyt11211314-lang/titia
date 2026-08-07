import { describe, expect, it } from "vitest";
import { buildLedgerWorkbook, buildTransactionCsv, parseLedgerWorkbook } from "./spreadsheet";
import { emptyData } from "./store";

describe("ledger spreadsheets", () => {
  it("exports all ledger entities into a readable workbook", async () => {
    const data = emptyData();
    data.transactions.push({ id: "t1", type: "expense", amount: 28.5, category: "餐饮", accountId: "cash", date: "2026-08-06", note: "晚餐", source: "manual", reviewStatus: "confirmed", createdAt: "", updatedAt: "" });
    data.budgets.push({ id: "b1", category: "餐饮", amount: 1000, month: "2026-08" });

    const workbook = await buildLedgerWorkbook(data);
    const preview = await parseLedgerWorkbook(workbook, data);

    expect(preview.summary).toEqual({ total: 1, income: 0, expense: 1, errors: 0 });
    expect(preview.transactions[0]).toMatchObject({ amount: 28.5, category: "餐饮", accountId: "cash", reviewStatus: "candidate" });
    expect(preview.sheetNames).toEqual(expect.arrayContaining(["账单", "分类", "账户", "预算", "资产"]));
  });

  it("creates a UTF-8 CSV with complete transaction columns", () => {
    const data = emptyData();
    data.transactions.push({ id: "t1", type: "income", amount: 99, category: "工资", accountId: "cash", date: "2026-08-06", note: "奖金", source: "manual", reviewStatus: "confirmed", createdAt: "", updatedAt: "" });

    const csv = buildTransactionCsv(data);

    expect(csv).toContain("日期,收入支出,金额,分类,账户,备注,来源,状态");
    expect(csv).toContain("2026-08-06,收入,99,工资,现金账户,奖金,manual,confirmed");
  });

  it("imports the supplied 12-column template with both category levels", async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ 日期:"2026-08-07", 时间:"09:30:00", 类型:"支出", 金额:35.8, 一级分类:"餐饮", 二级分类:"午餐", 账户:"现金账户", 备注:"麦当劳" }]), "收支账单");
    const data = emptyData();
    const result = await parseLedgerWorkbook(XLSX.write(workbook,{type:"array",bookType:"xlsx"}), data);
    expect(result.transactions[0]).toMatchObject({ category:"餐饮", subcategory:"午餐", amount:35.8, note:"麦当劳" });
  });
});
