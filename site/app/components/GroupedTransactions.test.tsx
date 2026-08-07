import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GroupedTransactions } from "./GroupedTransactions";
import type { Transaction } from "../lib/store";
import { defaultLedgerCategories } from "../lib/category-config";

afterEach(cleanup);
const transactions: Transaction[] = [
  { id: "1", date: "2026-08-06T12:00:00", type: "expense", amount: 35, category: "餐饮", subcategory: "午餐", merchant: "麦当劳", accountId: "cash", note: "", source: "ocr", imageId: "image", reviewStatus: "confirmed", createdAt: "", updatedAt: "" },
  { id: "2", date: "2026-08-06T18:00:00", type: "expense", amount: 99, category: "购物", merchant: "淘宝", accountId: "cash", note: "", source: "ocr", reviewStatus: "confirmed", createdAt: "", updatedAt: "" },
];

describe("GroupedTransactions", () => {
  it("renders one collapsed date card and expands its transactions", async () => {
    const user = userEvent.setup();
    render(<GroupedTransactions transactions={transactions} accounts={[{ id: "cash", name: "现金", opening: 0, kind: "现金" }]} onDelete={vi.fn()} onOpenAttachment={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: /8月6日/ })).toHaveLength(1);
    expect(screen.queryByText("麦当劳")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /8月6日/ }));
    expect(screen.getByText("麦当劳")).toBeInTheDocument();
    expect(screen.getByText("淘宝")).toBeInTheDocument();
  });

  it("opens an attachment and confirms deletion", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onOpenAttachment = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<GroupedTransactions transactions={transactions} accounts={[]} onDelete={onDelete} onOpenAttachment={onOpenAttachment} />);
    await user.click(screen.getByRole("button", { name: /8月6日/ }));
    await user.click(screen.getByRole("button", { name: "查看麦当劳原图" }));
    await user.click(screen.getByRole("button", { name: "删除麦当劳账单" }));
    expect(onOpenAttachment).toHaveBeenCalledWith(transactions[0]);
    expect(onDelete).toHaveBeenCalledWith(transactions[0]);
  });

  it("selects transactions and applies a batch category", async () => {
    const user = userEvent.setup();
    const onBatchCategory = vi.fn();
    render(<GroupedTransactions transactions={transactions} accounts={[]} categories={[{ id: "food", name: "餐饮", type: "expense", parentId: "root" }]} onDelete={vi.fn()} onOpenAttachment={vi.fn()} onBatchCategory={onBatchCategory} />);
    await user.click(screen.getByRole("button", { name: "批量管理" }));
    await user.click(screen.getByRole("button", { name: /8月6日/ }));
    await user.click(screen.getByRole("button", { name: "选择麦当劳" }));
    await user.click(screen.getByRole("button", { name: /修改分类/ }));
    await user.click(screen.getByRole("button", { name: "餐饮" }));
    expect(onBatchCategory).toHaveBeenCalledWith(["1"], "餐饮");
  });

  it("shows the normalized primary and secondary category instead of imported noise", async () => {
    const user = userEvent.setup();
    const income: Transaction = { id: "income", date: "2026-08-05T18:00:00", type: "income", amount: 111, category: "谢", subcategory: "转账", merchant: "收到微信转账", accountId: "wechat", note: "", source: "import", reviewStatus: "confirmed", createdAt: "", updatedAt: "" };
    render(<GroupedTransactions transactions={[income]} accounts={[{ id: "wechat", name: "微信", opening: 0, kind: "微信" }]} categories={defaultLedgerCategories} onDelete={vi.fn()} onOpenAttachment={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /8月5日/ }));
    expect(screen.getByText("收入 / 转账收入 · 微信")).toBeInTheDocument();
  });
});
