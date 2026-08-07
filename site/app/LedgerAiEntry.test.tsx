import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TitiaApp } from "./TitiaApp";
import { emptyData, store } from "./lib/store";

afterEach(cleanup);
beforeEach(async () => { await store.save(emptyData()); });

describe("ledger AI shortcut", () => {
  it("stays in every ledger header and opens clipboard recognition", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "readText").mockResolvedValue("微信支付\n商户：麦当劳\n实付款：35元");
    render(<TitiaApp />);
    await user.click(await screen.findByRole("button", { name: "小账" }));
    expect(screen.getByRole("button", { name: "AI识别剪贴板" })).toBeInTheDocument();
    expect(screen.getByRole("complementary")).not.toHaveTextContent("AI识别");
    await user.click(screen.getByRole("button", { name: "AI识别剪贴板" }));
    expect((await screen.findByRole("textbox", { name: "识别文字" }) as HTMLTextAreaElement).value).toContain("麦当劳");
    expect(screen.getAllByDisplayValue("麦当劳").length).toBeGreaterThan(0);
  });
});
