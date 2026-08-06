import { describe, expect, it } from "vitest";
import { buildPeriodCalendar, countdownStatus } from "./lifeDates";

describe("countdownStatus", () => {
  it("returns a pending label for an invalid date instead of NaN", () => {
    expect(countdownStatus("", new Date("2026-08-06T12:00:00"))).toEqual({ valid: false, label: "待设置日期", days: null, direction: "pending" });
  });

  it("describes elapsed and future days", () => {
    expect(countdownStatus("2026-08-01", new Date("2026-08-06T12:00:00"))).toMatchObject({ days: 5, direction: "elapsed" });
    expect(countdownStatus("2026-08-10", new Date("2026-08-06T12:00:00"))).toMatchObject({ days: 4, direction: "remaining" });
  });
});

describe("buildPeriodCalendar", () => {
  it("marks recorded, predicted and current dates", () => {
    const calendar = buildPeriodCalendar(2026, 7, [{ id: "p", start: "2026-08-01", end: "2026-08-05" }], new Date("2026-08-06T12:00:00"));
    expect(calendar.find((day) => day.date === "2026-08-02")).toMatchObject({ period: true });
    expect(calendar.find((day) => day.date === "2026-08-06")).toMatchObject({ today: true });
    expect(calendar.some((day) => day.predicted)).toBe(true);
  });
});
