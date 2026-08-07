import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CardSelect } from "./CardSelect";

describe("CardSelect", () => {
  it("uses a selection card instead of a native select", async () => {
    const user = userEvent.setup();
    render(<CardSelect label="类型" name="type" options={[{ value: "a", label: "选项A" }, { value: "b", label: "选项B" }]} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /选项A/ }));
    await user.click(screen.getByRole("button", { name: "选项B" }));
    expect(screen.getByLabelText("类型")).toHaveValue("b");
  });

  it("chooses grouped options in primary and secondary card steps", async () => {
    const user = userEvent.setup();
    render(<CardSelect label="分类" name="category" options={[{ value: "breakfast", label: "早餐", group: "餐饮" }, { value: "metro", label: "地铁", group: "交通" }]} />);
    await user.click(screen.getByRole("button", { name: /早餐/ }));
    expect(screen.getByRole("button", { name: /餐饮/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "地铁" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /交通/ }));
    await user.click(screen.getByRole("button", { name: "地铁" }));
    expect(screen.getByLabelText("分类")).toHaveValue("metro");
  });
});
