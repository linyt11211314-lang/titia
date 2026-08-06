import { describe, expect, it } from "vitest";
import { findDuplicate } from "./duplicateDetection";
import type { Transaction } from "./store";

const existing: Transaction = { id: "old", amount: 35.8, type: "expense", category: "餐饮", subcategory: "午餐", merchant: "麦当劳", accountId: "wechat", date: "2026-08-06T12:30:00+08:00", note: "", source: "manual", sourceProvider: "wechat", reviewStatus: "confirmed", createdAt: "", updatedAt: "" };

describe("findDuplicate", () => {
  it("flags a same-time amount merchant and account match", () => {
    const result = findDuplicate({ amount: 35.8, merchant: "麦当劳", accountId: "wechat", date: "2026-08-06T12:31:00+08:00", sourceProvider: "wechat" }, [existing]);
    expect(result.possible).toBe(true);
    expect(result.similarity).toBeGreaterThanOrEqual(0.9);
    expect(result.matchedTransactionId).toBe("old");
  });

  it("reduces similarity outside the time window", () => {
    const result = findDuplicate({ amount: 35.8, merchant: "麦当劳", accountId: "wechat", date: "2026-08-12T12:31:00+08:00", sourceProvider: "wechat" }, [existing]);
    expect(result.possible).toBe(false);
    expect(result.similarity).toBeLessThan(0.78);
  });

  it("warns but does not reject a possible duplicate", () => {
    const result = findDuplicate({ amount: 35.8, merchant: "麦当劳餐厅", accountId: "cash", date: "2026-08-06T18:00:00+08:00", sourceProvider: "wechat" }, [existing]);
    expect(result.possible).toBe(true);
    expect(result.similarity).toBeGreaterThanOrEqual(0.78);
  });
});
