import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
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

  it("shows a real-data overview above every ledger secondary page", async () => {
    const user = userEvent.setup();
    render(<TitiaApp />);
    await user.click(await screen.findByRole("button", { name: "小账" }));

    for (const [section, overview] of [["账单", "本月账单"], ["资产", "资产总览"], ["分析", "分析概览"], ["分类", "分类统计"], ["导入导出", "数据管理概览"]]) {
      await user.click(screen.getByRole("button", { name: new RegExp(`${section}$`) }));
      expect(screen.getByText(overview)).toBeInTheDocument();
    }
  });

  it("uses dedicated ledger and time icons and keeps AI recognition separate", async () => {
    const user = userEvent.setup();
    render(<TitiaApp />);
    await user.click(await screen.findByRole("button", { name: "小账" }));
    expect(screen.getByRole("button", { name: /🧾.*账单/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /📥.*导入导出/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /✨.*AI识别/ })).toBeInTheDocument();

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

  it("exposes Spark history and interactive relationship boards under time", async () => {
    const user = userEvent.setup();
    render(<TitiaApp />);
    await user.click(await screen.findByRole("button", { name: "时光" }));
    expect(screen.getByRole("button", { name: /✨.*灵光一闪/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /💙.*关系/ }));
    expect(screen.getByRole("button", { name: "💞 感动瞬间" })).toHaveClass("active");
    await user.click(screen.getByRole("button", { name: "🔎 矛盾复盘" }));
    expect(screen.getByRole("button", { name: "🔎 矛盾复盘" })).toHaveClass("active");
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
