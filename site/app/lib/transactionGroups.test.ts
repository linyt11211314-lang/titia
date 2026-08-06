import { describe, expect, it } from "vitest";
import { groupTransactionsByLocalDate } from "./transactionGroups";
import type { Transaction } from "./store";

const tx = (id: string, date: string, type: "income" | "expense", amount: number): Transaction => ({ id, date, type, amount, category: "餐饮", accountId: "cash", note: "", source: "manual", reviewStatus: "confirmed", createdAt: "", updatedAt: "" });

describe("groupTransactionsByLocalDate", () => {
  it("groups same-day bills into one card with literal totals", () => {
    const groups = groupTransactionsByLocalDate([tx("1", "2026-08-06T09:00:00", "expense", 35), tx("2", "2026-08-06T18:00:00", "expense", 99), tx("3", "2026-08-06T20:00:00", "income", 20)]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(expect.objectContaining({ date: "2026-08-06", expense: 134, income: 20, count: 3 }));
  });

  it("sorts local dates and transactions newest first", () => {
    const groups = groupTransactionsByLocalDate([tx("old", "2026-08-05T20:00:00", "expense", 1), tx("morning", "2026-08-06T09:00:00", "expense", 2), tx("night", "2026-08-06T21:00:00", "expense", 3)]);
    expect(groups.map((group) => group.date)).toEqual(["2026-08-06", "2026-08-05"]);
    expect(groups[0].transactions.map((item) => item.id)).toEqual(["night", "morning"]);
  });

  it("omits unconfirmed candidates from the bill list", () => {
    const candidate = { ...tx("candidate", "2026-08-06", "expense", 9), reviewStatus: "candidate" as const };
    expect(groupTransactionsByLocalDate([candidate])).toEqual([]);
  });
});
