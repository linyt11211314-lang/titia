import { describe, expect, it } from "vitest";
import { addLedgerCategory, deleteLedgerCategory, groupAccounts, renameLedgerCategory } from "./ledgerManagement";
import type { Account, LedgerCategory } from "./store";

const categories: LedgerCategory[] = [{ id: "food", name: "餐饮", type: "expense" }, { id: "lunch", name: "午餐", type: "expense", parentId: "food" }];

describe("ledger management", () => {
  it("separates liabilities from assets", () => {
    const accounts: Account[] = [{ id: "cash", name: "现金", opening: 10, kind: "现金" }, { id: "card", name: "招商信用卡", opening: 0, kind: "信用卡" }];
    expect(groupAccounts(accounts)).toEqual({ assets: [accounts[0]], liabilities: [accounts[1]], loans: [] });
  });

  it("adds, renames and removes a category subtree", () => {
    const added = addLedgerCategory(categories, { id: "dinner", name: "晚餐", type: "expense", parentId: "food" });
    expect(renameLedgerCategory(added, "dinner", "聚餐").find((item) => item.id === "dinner")?.name).toBe("聚餐");
    expect(deleteLedgerCategory(added, "food")).toEqual([]);
  });
});
