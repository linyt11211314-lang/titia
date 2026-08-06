import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TitiaApp } from "./TitiaApp";

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
});
