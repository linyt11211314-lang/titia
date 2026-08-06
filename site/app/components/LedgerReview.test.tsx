import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LedgerReview } from "./LedgerReview";
import type { ReviewBatch } from "../lib/billParser";

afterEach(cleanup);

const batch = (): ReviewBatch => ({
  id: "batch", rawText: "receipt", createdAt: "2026-08-06",
  drafts: [
    { id: "a", selected: false, type: "expense", amount: 80, amountCandidates: [{ amount: 80, score: 100, confidence: .95, label: "实付款", excluded: false, evidence: "实付款80" }, { amount: 100, score: 90, confidence: .4, label: "付款金额", excluded: false, evidence: "付款金额100" }], needsAmountChoice: true, category: "餐饮", subcategory: "午餐", needsCategoryReview: false, merchant: "麦当劳", accountId: "cash", date: "2026-08-06T12:00:00", sourceProvider: "wechat", confidence: .96, duplicateCheck: { possible: false, similarity: 0 }, possibleDuplicate: false, rawText: "", valid: false },
    { id: "b", selected: false, type: "expense", amount: 35.8, amountCandidates: [{ amount: 35.8, score: 100, confidence: .95, label: "实付款", excluded: false, evidence: "" }], needsAmountChoice: false, category: "餐饮", subcategory: "午餐", needsCategoryReview: false, merchant: "肯德基", accountId: "cash", date: "2026-08-06T13:00:00", sourceProvider: "wechat", confidence: .92, duplicateCheck: { possible: true, similarity: .92, matchedTransactionId: "old" }, possibleDuplicate: true, rawText: "", valid: true },
  ],
});

describe("LedgerReview", () => {
  it("shows amount alternatives and resolves the required choice", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LedgerReview batch={batch()} accounts={[{ id: "cash", name: "现金", opening: 0, kind: "现金" }]} categories={[]} onChange={onChange} onSave={vi.fn()} onReparse={vi.fn()} />);
    expect(screen.getByText("发现多个金额，请选择")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /¥80\.00/ }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: "a", amount: 80, needsAmountChoice: false, valid: true }));
  });

  it("marks duplicates and does not select them by default", () => {
    render(<LedgerReview batch={batch()} accounts={[]} categories={[]} onChange={vi.fn()} onSave={vi.fn()} onReparse={vi.fn()} />);
    expect(screen.getByText(/可能重复账单 · 相似度 92%/)).toBeInTheDocument();
    expect(screen.getByLabelText("选择 肯德基")).not.toBeChecked();
  });

  it("saves only explicitly selected valid drafts", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const data = batch();
    data.drafts[0].needsAmountChoice = false;
    data.drafts[0].valid = true;
    render(<LedgerReview batch={data} accounts={[]} categories={[]} onChange={vi.fn()} onSave={onSave} onReparse={vi.fn()} />);
    await user.click(screen.getByLabelText("选择 麦当劳"));
    await user.click(screen.getByRole("button", { name: "保存选中账单" }));
    expect(onSave).toHaveBeenCalledWith(["a"]);
  });

  it("supports removing a draft and re-recognizing", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onReparse = vi.fn();
    render(<LedgerReview batch={batch()} accounts={[]} categories={[]} onChange={vi.fn()} onDelete={onDelete} onSave={vi.fn()} onReparse={onReparse} />);
    await user.click(screen.getAllByRole("button", { name: "删除草稿" })[0]);
    await user.click(screen.getByRole("button", { name: "重新识别" }));
    expect(onDelete).toHaveBeenCalledWith("a");
    expect(onReparse).toHaveBeenCalled();
  });
});
