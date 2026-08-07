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
});
