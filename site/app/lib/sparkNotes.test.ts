import { describe, expect, it } from "vitest";
import { filterSparkNotes, migrateLegacySparks } from "./sparkNotes";

describe("spark notes", () => {
  it("converts legacy sparks without losing content", () => {
    const notes = migrateLegacySparks([{ id: "old", tag: "备忘录", body: "需要优化自动记账", date: "2026-08-06T08:24:00.000Z" }]);
    expect(notes[0]).toMatchObject({ id: "old", title: "需要优化自动记账", content: "需要优化自动记账", tag: "备忘录" });
  });

  it("filters by tag while 全部 returns every note", () => {
    const notes = migrateLegacySparks([{ id: "a", tag: "电影", body: "A", date: "2026-08-06" }, { id: "b", tag: "脑洞", body: "B", date: "2026-08-06" }]);
    expect(filterSparkNotes(notes, "电影")).toHaveLength(1);
    expect(filterSparkNotes(notes, "全部")).toHaveLength(2);
  });
});
