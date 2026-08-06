import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataManagement } from "./DataManagement";
import { emptyData } from "../lib/store";

afterEach(cleanup);

describe("DataManagement", () => {
  it("previews a legacy backup before it can merge into IndexedDB", async () => {
    const legacy = { version: 1, tables: { records: [], media: [], pets: [], petHealth: [], people: [], todos: [{ id: "t1", title: "迁移", done: false }], shopping: [], financeItems: [], cycles: [], vaultMeta: [], vaultItems: [], countdownEvents: [], transactions: [], rules: [], accounts: [], categories: [], budgets: [], settings: [] } };
    render(<DataManagement data={emptyData()} setData={vi.fn()} notify={vi.fn()} onExport={vi.fn()} />);
    const input = screen.getByLabelText("选择高级恢复文件");
    await userEvent.upload(input, new File([JSON.stringify(legacy)], "backup.json", { type: "application/json" }));
    expect(await screen.findByText("发现 Titia 数据恢复")).toBeInTheDocument();
    expect(screen.getByText("待办 1 条")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "确认导入" })).toBeInTheDocument();
  });

  it("keeps one-click migration and advanced recovery as separate actions", () => {
    render(<DataManagement data={emptyData()} setData={vi.fn()} notify={vi.fn()} onExport={vi.fn()} />);
    expect(screen.getByRole("button", { name: /生成迁移链接/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /高级恢复/ })).toBeInTheDocument();
    expect(screen.getByText("恢复记录")).toBeInTheDocument();
  });
});
