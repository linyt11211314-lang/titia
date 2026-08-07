import { describe, expect, it } from "vitest";
import { formatCompactNumber } from "./format";
import { countdownDetails, countdownMonths } from "./lifeDates";
import { filterTransactionsByRange, spendingBreakdown } from "./ledgerAnalytics";
import { emptyData, normalizeAppData } from "./store";

describe("V2 data and calculations", () => {
  it("formats long values without changing the numeric slot", () => {
    expect(formatCompactNumber(1234567.89, true)).toBe("¥123.46万");
    expect(formatCompactNumber(-120000000, true)).toBe("-¥1.20亿");
  });

  it("keeps old data while supplying V2 preferences", () => {
    const current = emptyData(); current.todos.push({ id: "t", text: "保留", done: false, createdAt: "" });
    const normalized = normalizeAppData(current);
    expect(normalized.todos[0].text).toBe("保留");
    expect(normalized.userPreferences.theme).toBe("sky");
    expect(normalized.userPreferences.defaultAccountId).toBe("cash");
  });

  it("calculates footprint and yearly expectation with leap-day support", () => {
    expect(countdownDetails({ date: "2024-02-29", repeat: false }, new Date(2026, 7, 7))).toMatchObject({ mode: "footprint", totalDays: 890 });
    const leap = countdownDetails({ date: "2024-02-29", repeat: true }, new Date(2026, 7, 7));
    expect(leap.mode).toBe("expectation");
    expect(leap.nextDate).toBe("2028-02-29");
    expect(countdownMonths([{ date: "2026-08-01" }, { date: "2026-08-20" }])).toEqual([8]);
  });

  it("filters analysis ranges and calculates percentages and ranking", () => {
    const data = emptyData();
    data.transactions = [
      { id:"a",type:"expense",amount:80,category:"餐饮",accountId:"cash",date:"2026-08-07",note:"午餐",source:"manual",reviewStatus:"confirmed",createdAt:"",updatedAt:"" },
      { id:"b",type:"expense",amount:20,category:"交通",accountId:"cash",date:"2026-08-06",note:"地铁",source:"manual",reviewStatus:"confirmed",createdAt:"",updatedAt:"" },
    ];
    const items = filterTransactionsByRange(data.transactions, { mode:"custom", start:"2026-08-07", end:"2026-08-07" });
    expect(items).toHaveLength(1);
    expect(spendingBreakdown(data.transactions)[0]).toMatchObject({ category:"餐饮", amount:80, percentage:80 });
  });
});
