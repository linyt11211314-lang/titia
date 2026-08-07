import { describe, expect, it, vi } from "vitest";
import { scrollAppToTop } from "./scrollTop";

describe("global top-area scroll", () => {
  it("scrolls both the window and nested app scrollers", () => {
    const nested = { scrollTo: vi.fn() };
    const root = { querySelectorAll: vi.fn(() => [nested, nested]) } as unknown as Pick<Document, "querySelectorAll">;
    const view = { scrollTo: vi.fn() } as unknown as Pick<Window, "scrollTo">;
    scrollAppToTop(root, view);
    expect(view.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(nested.scrollTo).toHaveBeenCalledTimes(2);
  });
});
