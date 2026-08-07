import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { TitiaApp } from "./TitiaApp";

afterEach(cleanup);

describe("TitiaApp", () => {
  it("renders the five primary destinations after local data opens", async () => {
    render(<TitiaApp />);
    for (const label of ["今日", "小窝", "小账", "时光", "我呀"]) {
      expect(await screen.findByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("accepts decimal currency values", async () => {
    const user = userEvent.setup();
    render(<TitiaApp />);
    await user.click(await screen.findByRole("button", { name: "小账" }));
    await user.click(screen.getByRole("button", { name: "记一笔" }));
    expect(screen.getByLabelText("金额")).toHaveAttribute("step", "0.01");
  });

  it("opens the real budget form from the ledger home budget card", async () => {
    const user = userEvent.setup();
    render(<TitiaApp />);
    await user.click(await screen.findByRole("button", { name: "小账" }));
    await user.click(screen.getByRole("button", { name: "设置本月预算" }));
    expect(screen.getByRole("heading", { name: "设置预算" })).toBeInTheDocument();
    expect(screen.getByLabelText("预算金额")).toHaveAttribute("type", "number");
  });

  it("keeps the current weather visible on phone-width layouts", () => {
    const mobileFixes = readFileSync("app/mobile-fixes.css", "utf8");
    expect(mobileFixes).toContain("@media(max-width:420px){.weather{display:flex");
  });

  it("includes an iPhone 14 Pro safe-area layout", () => {
    const mobileFixes = readFileSync("app/mobile-fixes.css", "utf8");
    expect(mobileFixes).toContain("@media(max-width:430px)");
    expect(mobileFixes).toContain("env(safe-area-inset-top)");
    expect(mobileFixes).toContain("env(safe-area-inset-bottom)");
    expect(mobileFixes).toContain(".bottom-nav{position:fixed!important");
    expect(mobileFixes).toContain("-webkit-touch-callout:none");
  });

  it("shows a real-data overview above every ledger secondary page", async () => {
    const user = userEvent.setup();
    render(<TitiaApp />);
    await user.click(await screen.findByRole("button", { name: "小账" }));

    for (const [section, overview] of [["账单", "本月账单"], ["资产", "资产总览"], ["分析", "分析概览"], ["分类", "分类统计"]]) {
      await user.click(screen.getByRole("button", { name: new RegExp(`${section}$`) }));
      expect(screen.getByText(overview)).toBeInTheDocument();
    }
    await user.click(screen.getByRole("button", { name: /设置$/ }));
    expect(screen.getByText("数据管理概览")).toBeInTheDocument();
    expect(screen.getByText("表格数据中心")).toBeInTheDocument();
    expect(screen.getByText("DeepSeek API 配置")).toBeInTheDocument();
  });

  it("uses dedicated ledger and time icons and keeps AI recognition separate", async () => {
    const user = userEvent.setup();
    render(<TitiaApp />);
    await user.click(await screen.findByRole("button", { name: "小账" }));
    expect(screen.getByRole("button", { name: /🧾.*账单/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /⚙️.*设置/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI识别剪贴板" })).toBeInTheDocument();
    expect(screen.getByRole("complementary")).not.toHaveTextContent("AI识别");

    await user.click(screen.getByRole("button", { name: "时光" }));
    expect(screen.getByRole("button", { name: /📖.*日记/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /💙.*关系/ })).toBeInTheDocument();
  });

  it("separates expense and income category views", async () => {
    const user = userEvent.setup();
    render(<TitiaApp />);
    await user.click(await screen.findByRole("button", { name: "小账" }));
    await user.click(screen.getByRole("button", { name: /分类$/ }));
    expect(screen.getByRole("button", { name: "支出分类" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "收入分类" })).toBeInTheDocument();
  });

  it("starts the spark button at eighty percent opacity", async () => {
    render(<TitiaApp />);
    expect(await screen.findByRole("button", { name: "灵光一闪" })).toHaveStyle({ opacity: "0.8" });
  });

  it("keeps Spark out of the Time sidebar and opens it fullscreen from the FAB", async () => {
    const user = userEvent.setup();
    render(<TitiaApp />);
    await user.click(await screen.findByRole("button", { name: "时光" }));
    expect(screen.queryByRole("button", { name: /✨.*灵光一闪/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "灵光一闪" }));
    expect(screen.getByRole("dialog", { name: "灵光一闪" })).toHaveClass("spark-fullscreen");
    expect(screen.queryByRole("navigation", { name: "主导航" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "返回原页面" }));
    await user.click(screen.getByRole("button", { name: /💙.*关系/ }));
    expect(screen.getByRole("button", { name: "💞 感动瞬间" })).toHaveClass("active");
    await user.click(screen.getByRole("button", { name: "🔎 矛盾复盘" }));
    expect(screen.getByRole("button", { name: "🔎 矛盾复盘" })).toHaveClass("active");
  });

  it("opens opacity settings when the Spark button is held without moving", async () => {
    render(<TitiaApp />);
    const button = await screen.findByRole("button", { name: "灵光一闪" });
    fireEvent.pointerDown(button, { pointerId: 1, clientX: 300, clientY: 300 });
    await new Promise((resolve) => window.setTimeout(resolve, 1050));
    expect(screen.getByLabelText("灵光按钮设置")).toBeInTheDocument();
  });

  it("starts moving the Spark button immediately and does not open settings", async () => {
    render(<TitiaApp />);
    const button = await screen.findByRole("button", { name: "灵光一闪" });
    fireEvent.pointerDown(button, { pointerId: 2, clientX: 300, clientY: 300 });
    fireEvent.pointerMove(button, { pointerId: 2, clientX: 180, clientY: 260 });
    expect(button).toHaveClass("editing");
    fireEvent.pointerUp(button, { pointerId: 2, clientX: 180, clientY: 260 });
    expect(screen.queryByLabelText("灵光按钮设置")).not.toBeInTheDocument();
  });

  it("opens an accessible vault password sheet", async () => {
    const user = userEvent.setup();
    render(<TitiaApp />);
    await user.click(await screen.findByRole("button", { name: "小窝" }));
    await user.click(screen.getByRole("button", { name: /密码箱/ }));
    await user.click(screen.getByRole("button", { name: "设置主密码" }));
    expect(screen.getByRole("heading", { name: "设置主密码" })).toBeInTheDocument();
    expect(screen.getByLabelText("请输入密码")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("确认密码")).toBeInTheDocument();
  });
});
