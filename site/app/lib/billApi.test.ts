import { describe, expect, it, vi } from "vitest";
import { apiBillsToText, recognizeBillsWithApi } from "./billApi";

const config = { enabled: true, endpoint: "https://api.example.com/v1", model: "bill-model", apiKey: "secret" };

describe("bill recognition API", () => {
  it("calls an OpenAI-compatible endpoint and parses multiple bills", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ bills: [{ amount: 80, merchant: "麦当劳" }, { amount: 12, merchant: "地铁" }] }) } }] }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const bills = await recognizeBillsWithApi(config, "账单文字", fetcher as typeof fetch);
    expect(fetcher).toHaveBeenCalledWith("https://api.example.com/v1/chat/completions", expect.objectContaining({ method: "POST" }));
    expect(bills).toHaveLength(2);
    expect(apiBillsToText(bills)).toContain("实付款：80元");
  });

  it("rejects insecure endpoints", async () => {
    await expect(recognizeBillsWithApi({ ...config, endpoint: "http://example.com" }, "text", vi.fn() as unknown as typeof fetch)).rejects.toThrow("HTTPS");
  });
});
