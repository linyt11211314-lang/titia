import { describe, expect, it, vi } from "vitest";
import { recognizeImageLocally } from "./localOcr";

describe("recognizeImageLocally", () => {
  it("uses the browser detector without invoking the fallback", async () => {
    const fallback = vi.fn();
    const text = await recognizeImageLocally(new Blob(["image"]), {
      detect: async () => [{ rawValue: "微信支付" }, { rawValue: "实付款 35.80元" }],
      fallback,
    });
    expect(text).toBe("微信支付\n实付款 35.80元");
    expect(fallback).not.toHaveBeenCalled();
  });

  it("uses the local worker fallback when TextDetector is unavailable", async () => {
    const fallback = vi.fn().mockResolvedValue("支付宝\n付款金额 80元");
    expect(await recognizeImageLocally(new Blob(["image"]), { fallback })).toBe("支付宝\n付款金额 80元");
    expect(fallback).toHaveBeenCalledOnce();
  });

  it("never calls fetch with image bytes", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await recognizeImageLocally(new Blob(["private image"]), { fallback: async () => "text" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
