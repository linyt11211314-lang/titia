import Dexie, { type EntityTable } from "dexie";
import { defaultLedgerCategories } from "./category-config";
import { mergeMigrationBundle, migrationCounts, type MergeResult, type MigrationBundle, type MigrationCounts } from "./migration";
import { migrateLegacySparks } from "./sparkNotes";

export type Id = string;
export type Todo = { id: Id; text: string; done: boolean; createdAt: string };
export type ShoppingItem = { id: Id; text: string; bought: boolean; createdAt: string };
export type Countdown = { id: Id; title: string; date: string; category: string; repeat: boolean; calendar: "solar" | "lunar"; createdAt: string };
export type PeriodRecord = { id: Id; start: string; end?: string; note?: string };
export type Pet = { id: Id; name: string; breed: string; birthday: string; sex: string };
export type PetRecord = { id: Id; petId: Id; kind: "moment" | "weight" | "health"; date: string; value: string; note: string; image?: string; images?: string[] };
export type Diary = { id: Id; title: string; body: string; mood: string; date: string; image?: string; images?: string[] };
export type Relationship = { id: Id; type: "moment" | "review"; person: string; title: string; body: string; reflection: string; date: string; images?: string[] };
export type Account = { id: Id; name: string; opening: number; kind: string; default?: boolean };
export type DuplicateCheck = { possible: boolean; similarity: number; matchedTransactionId?: Id };
export type Transaction = { id: Id; type: "income" | "expense"; amount: number; category: string; subcategory?: string; merchant?: string; accountId: Id; date: string; note: string; source: "manual" | "ocr" | "notification" | "import"; sourceProvider?: string; externalId?: string; dedupeKey?: string; rawPayload?: string; confidence?: number; imageId?: Id; duplicateCheck?: DuplicateCheck; reviewStatus: "candidate" | "confirmed"; createdAt: string; updatedAt: string };
export type TransactionAttachment = { id: Id; transactionId: Id; image: Blob; createdAt: string };
export type RestoreSnapshot = { id: Id; createdAt: string; reason: "before-import" | "manual"; label: string; payload: string; counts: MigrationCounts };
export type Budget = { id: Id; category: string; amount: number; month: string };
export type VaultEntry = { id: Id; title: string; ciphertext: string; iv: string; createdAt: string };
export type VaultMeta = { salt: string; verifier: string; verifierIv: string } | null;
export type Spark = { id: Id; tag: string; body: string; date: string };
export type SparkNote = { id: Id; title: string; content: string; tag: string; images: Id[]; createdAt: string; updatedAt: string };
export type SparkMedia = { id: Id; sparkNoteId: Id; image: Blob; createdAt: string };
export type LedgerCategory = { id: Id; name: string; type: "income" | "expense"; parentId?: Id };
export type SparkFabPreference = { x: number | null; y: number | null; opacity: number };
export type BillApiConfig = { enabled: boolean; endpoint: string; model: string; apiKey: string };

export type AppData = {
  version: 3;
  profile: { name: string; createdAt: string };
  todos: Todo[];
  shopping: ShoppingItem[];
  countdowns: Countdown[];
  periods: PeriodRecord[];
  pets: Pet[];
  petRecords: PetRecord[];
  diaries: Diary[];
  relationships: Relationship[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  categories: string[];
  ledgerCategories: LedgerCategory[];
  preferences: { sparkFab: SparkFabPreference };
  userPreferences: { floatingButton: SparkFabPreference; theme: "sky" | "peach" | "mint" | "lavender" | "cream" | "night"; defaultAccountId: Id; billApi: BillApiConfig };
  backupMeta: { lastSpreadsheetExportAt: string | null };
  vaultMeta: VaultMeta;
  vault: VaultEntry[];
  sparks: Spark[];
  sparkNotes: SparkNote[];
};

type StateRow = { id: "main"; data: AppData; updatedAt: string };

export const today = () => new Date().toISOString().slice(0, 10);
export const uid = () => crypto.randomUUID();

export function emptyData(): AppData {
  const transactionCategories = defaultLedgerCategories.filter((category) => category.parentId).map((category) => category.name);
  return {
    version: 3,
    profile: { name: "", createdAt: today() },
    todos: [], shopping: [], countdowns: [], periods: [], pets: [], petRecords: [],
    diaries: [], relationships: [], transactions: [], budgets: [], vault: [], sparks: [], sparkNotes: [],
    accounts: [{ id: "cash", name: "现金账户", opening: 0, kind: "现金" }],
    categories: transactionCategories,
    ledgerCategories: defaultLedgerCategories.map((category) => ({ ...category })),
    preferences: { sparkFab: { x: null, y: null, opacity: 0.8 } },
    userPreferences: { floatingButton: { x: null, y: null, opacity: 0.8 }, theme: "sky", defaultAccountId: "cash", billApi: { enabled: false, endpoint: "https://api.deepseek.com/v1", model: "deepseek-chat", apiKey: "" } },
    backupMeta: { lastSpreadsheetExportAt: null },
    vaultMeta: null,
  };
}

export function normalizeAppData(input: unknown): AppData {
  const defaults = emptyData();
  if (!input || typeof input !== "object") return defaults;
  const value = input as Partial<AppData> & { version?: number };
  const ledgerCategories = Array.isArray(value.ledgerCategories)
    ? value.ledgerCategories.filter((item): item is LedgerCategory => Boolean(item && typeof item.id === "string" && typeof item.name === "string" && (item.type === "income" || item.type === "expense")))
    : defaultLedgerCategories.map((category) => ({ ...category }));
  const savedSpark = value.userPreferences?.floatingButton ?? value.preferences?.sparkFab;
  const savedOpacity = typeof savedSpark?.opacity === "number" ? savedSpark.opacity : 0.8;
  const floatingButton = {
    x: typeof savedSpark?.x === "number" ? savedSpark.x : null,
    y: typeof savedSpark?.y === "number" ? savedSpark.y : null,
    opacity: Math.abs(savedOpacity - 0.7) < 0.001 ? 0.8 : Math.min(1, Math.max(0.2, savedOpacity)),
  };
  const sparkNotes = Array.isArray(value.sparkNotes) && value.sparkNotes.length
    ? value.sparkNotes
    : migrateLegacySparks(Array.isArray(value.sparks) ? value.sparks : []);
  return {
    ...defaults,
    ...value,
    version: 3,
    transactions: Array.isArray(value.transactions) ? value.transactions.map((transaction) => ({
      ...transaction,
      subcategory: transaction.subcategory ?? "",
      merchant: transaction.merchant ?? "",
      sourceProvider: transaction.sourceProvider ?? "",
    })) : [],
    ledgerCategories,
    sparkNotes,
    categories: Array.isArray(value.categories) && value.categories.length ? value.categories : ledgerCategories.filter((item) => item.parentId).map((item) => item.name),
    preferences: {
      sparkFab: floatingButton,
    },
    userPreferences: { floatingButton, theme: value.userPreferences?.theme ?? "sky", defaultAccountId: value.userPreferences?.defaultAccountId ?? value.accounts?.find(account=>account.default)?.id ?? defaults.accounts[0].id, billApi: { enabled:value.userPreferences?.billApi?.enabled??false,endpoint:value.userPreferences?.billApi?.endpoint||defaults.userPreferences.billApi.endpoint,model:value.userPreferences?.billApi?.model||defaults.userPreferences.billApi.model,apiKey:value.userPreferences?.billApi?.apiKey??"" } },
    backupMeta: { lastSpreadsheetExportAt: value.backupMeta?.lastSpreadsheetExportAt ?? null },
  };
}

export class TitiaStore extends Dexie {
  state!: EntityTable<StateRow, "id">;
  transactionAttachments!: EntityTable<TransactionAttachment, "id">;
  restoreSnapshots!: EntityTable<RestoreSnapshot, "id">;
  sparkMedia!: EntityTable<SparkMedia, "id">;

  constructor(name = "titia-time-pwa") {
    super(name);
    this.version(1).stores({ state: "id,updatedAt" });
    this.version(2).stores({ state: "id,updatedAt", transactionAttachments: "id,transactionId,createdAt" });
    this.version(3).stores({ state: "id,updatedAt", transactionAttachments: "id,transactionId,createdAt", restoreSnapshots: "id,createdAt,reason" });
    this.version(4).stores({ state: "id,updatedAt", transactionAttachments: "id,transactionId,createdAt", restoreSnapshots: "id,createdAt,reason", sparkMedia: "id,sparkNoteId,createdAt" });
  }

  async load(): Promise<AppData> {
    return normalizeAppData((await this.state.get("main"))?.data);
  }

  async save(data: AppData): Promise<void> {
    await this.state.put({ id: "main", data, updatedAt: new Date().toISOString() });
  }

  async export(): Promise<string> {
    const bundle = await this.createBundle();
    return JSON.stringify({ app: "titia", exportedAt: bundle.createdAt, data: bundle.data, attachments: bundle.attachments });
  }

  async restore(text: string): Promise<AppData> {
    const value = JSON.parse(text) as { app?: string; data?: unknown };
    if (value.app !== "titia" || !value.data || typeof value.data !== "object") throw new Error("这不是有效的 Titia 备份文件");
    const restored = normalizeAppData(value.data);
    await this.save(restored);
    return restored;
  }

  async putAttachment(attachment: TransactionAttachment): Promise<void> {
    await this.transactionAttachments.put(attachment);
  }

  async getAttachmentByTransaction(transactionId: Id): Promise<TransactionAttachment | undefined> {
    return this.transactionAttachments.where("transactionId").equals(transactionId).first();
  }

  async deleteAttachmentByTransaction(transactionId: Id): Promise<void> {
    await this.transactionAttachments.where("transactionId").equals(transactionId).delete();
  }

  async deleteTransactionWithAttachment(transactionId: Id): Promise<AppData> {
    return this.transaction("rw", this.state, this.transactionAttachments, async () => {
      const data = await this.load();
      const updated = { ...data, transactions: data.transactions.filter((transaction) => transaction.id !== transactionId) };
      await this.save(updated);
      await this.deleteAttachmentByTransaction(transactionId);
      return updated;
    });
  }

  async putSparkMedia(item: SparkMedia): Promise<void> { await this.sparkMedia.put(item); }
  async getSparkMedia(sparkNoteId: Id): Promise<SparkMedia[]> { return this.sparkMedia.where("sparkNoteId").equals(sparkNoteId).toArray(); }
  async deleteSparkMedia(sparkNoteId: Id): Promise<void> { await this.sparkMedia.where("sparkNoteId").equals(sparkNoteId).delete(); }

  async createBundle(): Promise<MigrationBundle> {
    const attachments = await this.transactionAttachments.toArray();
    const sparkMedia = await this.sparkMedia.toArray();
    return { version: 1, createdAt: new Date().toISOString(), data: await this.load(), attachments: await Promise.all([...attachments.map(async (item) => ({ id: item.id, kind: "transaction" as const, transactionId: item.transactionId, mime: item.image.type || "application/octet-stream", data: await blobToBase64(item.image), createdAt: item.createdAt })), ...sparkMedia.map(async (item) => ({ id: item.id, kind: "spark" as const, sparkNoteId: item.sparkNoteId, mime: item.image.type || "application/octet-stream", data: await blobToBase64(item.image), createdAt: item.createdAt }))]) };
  }

  async createRestoreSnapshot(label: string, reason: RestoreSnapshot["reason"] = "before-import"): Promise<RestoreSnapshot> {
    const bundle = await this.createBundle();
    const snapshot: RestoreSnapshot = { id: uid(), createdAt: new Date().toISOString(), reason, label, payload: JSON.stringify(bundle), counts: migrationCounts(bundle) };
    await this.restoreSnapshots.put(snapshot);
    const stale = await this.restoreSnapshots.orderBy("createdAt").reverse().offset(10).toArray();
    if (stale.length) await this.restoreSnapshots.bulkDelete(stale.map((item) => item.id));
    return snapshot;
  }

  async listRestoreSnapshots(): Promise<RestoreSnapshot[]> {
    return this.restoreSnapshots.orderBy("createdAt").reverse().toArray();
  }

  async restoreSnapshot(id: Id): Promise<AppData> {
    const snapshot = await this.restoreSnapshots.get(id);
    if (!snapshot) throw new Error("恢复记录不存在");
    const bundle = JSON.parse(snapshot.payload) as MigrationBundle;
    return this.transaction("rw", this.state, this.transactionAttachments, this.sparkMedia, async () => {
      await this.save(normalizeAppData(bundle.data));
      await this.transactionAttachments.clear();
      await this.sparkMedia.clear();
      const transactionMedia=bundle.attachments.filter((item)=>item.kind!=="spark"&&item.transactionId);
      const sparks=bundle.attachments.filter((item)=>item.kind==="spark"&&item.sparkNoteId);
      if (transactionMedia.length) await this.transactionAttachments.bulkPut(transactionMedia.map((item) => ({ id: item.id, transactionId: item.transactionId!, image: base64ToBlob(item.data, item.mime), createdAt: item.createdAt })));
      if (sparks.length) await this.sparkMedia.bulkPut(sparks.map((item)=>({id:item.id,sparkNoteId:item.sparkNoteId!,image:base64ToBlob(item.data,item.mime),createdAt:item.createdAt})));
      return this.load();
    });
  }

  async mergeBundle(incoming: MigrationBundle, snapshotLabel = "导入前自动备份"): Promise<MergeResult> {
    const current = await this.createBundle();
    const snapshot: RestoreSnapshot = { id: uid(), createdAt: new Date().toISOString(), reason: "before-import", label: snapshotLabel, payload: JSON.stringify(current), counts: migrationCounts(current) };
    const result = mergeMigrationBundle(current, incoming);
    return this.transaction("rw", this.state, this.transactionAttachments, this.sparkMedia, this.restoreSnapshots, async () => {
      await this.restoreSnapshots.put(snapshot);
      await this.save(result.bundle.data);
      const existing = new Set((await this.transactionAttachments.toArray()).map((item) => item.id));
      const sparkExisting = new Set((await this.sparkMedia.toArray()).map((item)=>item.id));
      const fresh = result.bundle.attachments.filter((item) => item.kind!=="spark"&&item.transactionId&&!existing.has(item.id));
      const freshSpark=result.bundle.attachments.filter((item)=>item.kind==="spark"&&item.sparkNoteId&&!sparkExisting.has(item.id));
      if (fresh.length) await this.transactionAttachments.bulkPut(fresh.map((item) => ({ id: item.id, transactionId: item.transactionId!, image: base64ToBlob(item.data, item.mime), createdAt: item.createdAt })));
      if(freshSpark.length)await this.sparkMedia.bulkPut(freshSpark.map((item)=>({id:item.id,sparkNoteId:item.sparkNoteId!,image:base64ToBlob(item.data,item.mime),createdAt:item.createdAt})));
      const stale = await this.restoreSnapshots.orderBy("createdAt").reverse().offset(10).toArray();
      if (stale.length) await this.restoreSnapshots.bulkDelete(stale.map((item) => item.id));
      return result;
    });
  }

  static balance(transactions: Transaction[], opening = 0): number {
    return transactions.filter((t) => t.reviewStatus === "confirmed").reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), opening);
  }
}

const bytesToBase64 = (bytes: Uint8Array) => { let binary = ""; for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)); return btoa(binary); };
const blobToBase64 = async (blob: Blob) => {
  if (typeof blob.arrayBuffer === "function") return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(reader.error); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.readAsDataURL(blob); });
};
const base64ToBlob = (value: string, mime: string) => new Blob([Uint8Array.from(atob(value), (char) => char.charCodeAt(0))], { type: mime });

const bytes = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
const base64 = (value: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(value instanceof Uint8Array ? value.buffer : value)));

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt as BufferSource, iterations: 210_000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptText(text: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return { ciphertext: base64(ciphertext), iv: base64(iv) };
}

export async function decryptText(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(iv) }, key, bytes(ciphertext));
  return new TextDecoder().decode(plain);
}

export async function createVault(password: string): Promise<{ meta: NonNullable<VaultMeta>; key: CryptoKey }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const verifier = await encryptText("titia-vault", key);
  return { meta: { salt: base64(salt), verifier: verifier.ciphertext, verifierIv: verifier.iv }, key };
}

export async function unlockVault(password: string, meta: NonNullable<VaultMeta>): Promise<CryptoKey> {
  const key = await deriveKey(password, bytes(meta.salt));
  if ((await decryptText(meta.verifier, meta.verifierIv, key)) !== "titia-vault") throw new Error("主密码不正确");
  return key;
}

export interface TransactionImportAdapter {
  id: string;
  detect(input: unknown): boolean;
  parse(input: unknown): Promise<Omit<Transaction, "id" | "createdAt" | "updatedAt">[]>;
}

export const store = new TitiaStore();
