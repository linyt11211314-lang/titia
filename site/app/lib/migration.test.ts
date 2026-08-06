import { describe, expect, it } from "vitest";
import { buildMigrationUrl, decodeMigrationFragment, encodeMigrationBundle, mergeMigrationBundle, migrationCounts, type MigrationBundle } from "./migration";
import { emptyData } from "./store";

const bundle = (): MigrationBundle => ({
  version: 1,
  createdAt: "2026-08-06T00:00:00.000Z",
  data: { ...emptyData(), diaries: [{ id: "d1", title: "日记", body: "仅本地", mood: "😊", date: "2026-08-06", image: "data:image/jpeg;base64,AA==" }], sparks: [{ id: "s1", tag: "产品", body: "灵感", date: "2026-08-06" }], transactions: [{ id: "t1", type: "expense", amount: 12, category: "餐饮", accountId: "cash", date: "2026-08-06", note: "", source: "import", reviewStatus: "confirmed", createdAt: "", updatedAt: "" }] },
  attachments: [{ id: "a1", transactionId: "t1", mime: "image/png", data: "AA==", createdAt: "2026-08-06" }],
});

describe("encrypted migration bundle", () => {
  it("round-trips compressed user data through authenticated encryption", async () => {
    const encoded = await encodeMigrationBundle(bundle());
    expect(encoded).toMatch(/^titia-v1\./);
    expect(encoded).not.toContain("仅本地");
    const decoded = await decodeMigrationFragment(encoded);
    expect(decoded.data.diaries).toEqual(bundle().data.diaries);
    expect(decoded.data.transactions[0]).toEqual(expect.objectContaining({ id: "t1", amount: 12, category: "餐饮" }));
    expect(decoded.attachments).toEqual(bundle().attachments);
  });

  it("uses randomized encryption and rejects tampering", async () => {
    const first = await encodeMigrationBundle(bundle());
    const second = await encodeMigrationBundle(bundle());
    expect(first).not.toBe(second);
    const tail = first.at(-1) === "A" ? "B" : "A";
    await expect(decodeMigrationFragment(first.slice(0, -1) + tail)).rejects.toThrow();
  });

  it("builds a fragment-only import URL", () => {
    const url = buildMigrationUrl("titia-v1.secret", { origin: "https://example.com", pathname: "/titia/" });
    expect(url).toBe("https://example.com/titia/import#titia-v1.secret");
    expect(url).not.toContain("?data=");
  });

  it("counts every preview category including images", () => {
    expect(migrationCounts(bundle())).toEqual(expect.objectContaining({ diaries: 1, sparks: 1, transactions: 1, images: 2 }));
  });

  it("merges arrays by ID without overwriting current records", () => {
    const current = bundle();
    current.data.diaries[0].body = "保留当前内容";
    const incoming = bundle();
    incoming.data.diaries.push({ id: "d2", title: "新日记", body: "新增", mood: "", date: "2026-08-05" });
    incoming.attachments.push({ id: "a2", transactionId: "t2", mime: "image/png", data: "AQ==", createdAt: "" });
    const result = mergeMigrationBundle(current, incoming);
    expect(result.bundle.data.diaries).toHaveLength(2);
    expect(result.bundle.data.diaries.find((item) => item.id === "d1")?.body).toBe("保留当前内容");
    expect(result.bundle.attachments).toHaveLength(2);
    expect(result.skipped).toBeGreaterThan(0);
  });
});
