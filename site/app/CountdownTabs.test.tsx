import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TitiaApp } from "./TitiaApp";
import { emptyData, store } from "./lib/store";

afterEach(cleanup);
beforeEach(async () => {
  const data = emptyData();
  data.countdowns = [
    { id: "past", title: "来到世界", date: "1997-11-21", category: "人生", repeat: false, calendar: "solar", createdAt: "2026-08-06" },
    { id: "next", title: "生日", date: "2026-11-21", category: "生日", repeat: true, calendar: "solar", createdAt: "2026-08-06" },
  ];
  await store.save(data);
});

describe("countdown view tabs", () => {
  it("shows footprint, expectation and timeline in one horizontal tab list", async () => {
    const user = userEvent.setup();
    render(<TitiaApp />);
    await user.click(await screen.findByRole("button", { name: "小窝" }));
    const tabs = screen.getByRole("navigation", { name: "倒数日视图" });
    expect(tabs.querySelectorAll("button")).toHaveLength(3);
    expect(screen.getByText("生日")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "足迹" }));
    expect(screen.getByText("来到世界")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "时间轴" }));
    expect(screen.getByText("人生足迹 · 人生")).toBeInTheDocument();
  });
});
