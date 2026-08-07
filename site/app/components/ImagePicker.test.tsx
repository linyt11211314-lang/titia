import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ImagePicker } from "./ImagePicker";

describe("ImagePicker", () => {
  it("supports multiple previews and removal", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValueOnce("blob:a").mockReturnValueOnce("blob:b");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ImagePicker name="images" label="图片" />);
    const input = screen.getByLabelText("图片");
    await user.upload(input, [new File(["a"], "a.png", { type: "image/png" }), new File(["b"], "b.png", { type: "image/png" })]);
    expect(screen.getAllByRole("img")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "删除图片 1" }));
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });
});
