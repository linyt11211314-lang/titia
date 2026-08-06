import { beforeEach, describe, expect, it } from "vitest";
import { TitiaStore, emptyData, type TransactionAttachment } from "./store";

describe("transaction attachments and deletion", () => {
  beforeEach(() => indexedDB.deleteDatabase("titia-attachments-test"));

  it("stores, reads, and removes an attachment by transaction", async () => {
    const store = new TitiaStore("titia-attachments-test");
    const attachment: TransactionAttachment = { id: "image-1", transactionId: "tx-1", image: new Blob(["private receipt"], { type: "image/jpeg" }), createdAt: "2026-08-06" };
    await store.putAttachment(attachment);
    expect((await store.getAttachmentByTransaction("tx-1"))?.id).toBe("image-1");
    await store.deleteAttachmentByTransaction("tx-1");
    expect(await store.getAttachmentByTransaction("tx-1")).toBeUndefined();
    store.close();
  });

  it("deleting an expense also deletes its attachment and restores balance", async () => {
    const store = new TitiaStore("titia-attachments-test");
    const data = emptyData();
    data.accounts[0].opening = 100;
    data.transactions = [{ id: "tx-1", type: "expense", amount: 35.8, category: "午餐", accountId: "cash", date: "2026-08-06", note: "麦当劳", source: "ocr", imageId: "image-1", reviewStatus: "confirmed", createdAt: "", updatedAt: "" }];
    await store.save(data);
    await store.putAttachment({ id: "image-1", transactionId: "tx-1", image: new Blob(["receipt"]), createdAt: "2026-08-06" });
    expect(TitiaStore.balance((await store.load()).transactions, 100)).toBe(64.2);
    const updated = await store.deleteTransactionWithAttachment("tx-1");
    expect(updated.transactions).toHaveLength(0);
    expect(TitiaStore.balance(updated.transactions, 100)).toBe(100);
    expect(await store.getAttachmentByTransaction("tx-1")).toBeUndefined();
    store.close();
  });

  it("deleting income reduces the derived account balance", async () => {
    const store = new TitiaStore("titia-attachments-test");
    const data = emptyData();
    data.transactions = [{ id: "income-1", type: "income", amount: 200, category: "工资", accountId: "cash", date: "2026-08-06", note: "", source: "manual", reviewStatus: "confirmed", createdAt: "", updatedAt: "" }];
    await store.save(data);
    expect(TitiaStore.balance(data.transactions, 50)).toBe(250);
    const updated = await store.deleteTransactionWithAttachment("income-1");
    expect(TitiaStore.balance(updated.transactions, 50)).toBe(50);
    store.close();
  });
});
