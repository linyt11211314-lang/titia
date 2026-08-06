import Dexie, { type EntityTable } from "dexie";

export type Id = string;
export type Todo = { id: Id; text: string; done: boolean; createdAt: string };
export type ShoppingItem = { id: Id; text: string; bought: boolean; createdAt: string };
export type Countdown = { id: Id; title: string; date: string; category: string; repeat: boolean; calendar: "solar" | "lunar"; createdAt: string };
export type PeriodRecord = { id: Id; start: string; end?: string; note?: string };
export type Pet = { id: Id; name: string; breed: string; birthday: string; sex: string };
export type PetRecord = { id: Id; petId: Id; kind: "moment" | "weight" | "health"; date: string; value: string; note: string; image?: string };
export type Diary = { id: Id; title: string; body: string; mood: string; date: string; image?: string };
export type Relationship = { id: Id; type: "moment" | "review"; person: string; title: string; body: string; reflection: string; date: string };
export type Account = { id: Id; name: string; opening: number; kind: string };
export type Transaction = { id: Id; type: "income" | "expense"; amount: number; category: string; accountId: Id; date: string; note: string; source: "manual" | "ocr" | "notification" | "import"; externalId?: string; dedupeKey?: string; rawPayload?: string; confidence?: number; reviewStatus: "candidate" | "confirmed"; createdAt: string; updatedAt: string };
export type Budget = { id: Id; category: string; amount: number; month: string };
export type VaultEntry = { id: Id; title: string; ciphertext: string; iv: string; createdAt: string };
export type VaultMeta = { salt: string; verifier: string; verifierIv: string } | null;
export type Spark = { id: Id; tag: string; body: string; date: string };

export type AppData = {
  version: 1;
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
  vaultMeta: VaultMeta;
  vault: VaultEntry[];
  sparks: Spark[];
};

type StateRow = { id: "main"; data: AppData; updatedAt: string };

export const today = () => new Date().toISOString().slice(0, 10);
export const uid = () => crypto.randomUUID();

export function emptyData(): AppData {
  return {
    version: 1,
    profile: { name: "", createdAt: today() },
    todos: [], shopping: [], countdowns: [], periods: [], pets: [], petRecords: [],
    diaries: [], relationships: [], transactions: [], budgets: [], vault: [], sparks: [],
    accounts: [{ id: "cash", name: "现金账户", opening: 0, kind: "现金" }],
    categories: ["餐饮", "购物", "交通", "居住", "娱乐", "健康", "人情关系", "其他"],
    vaultMeta: null,
  };
}

export class TitiaStore extends Dexie {
  state!: EntityTable<StateRow, "id">;

  constructor(name = "titia-time-pwa") {
    super(name);
    this.version(1).stores({ state: "id,updatedAt" });
  }

  async load(): Promise<AppData> {
    return (await this.state.get("main"))?.data ?? emptyData();
  }

  async save(data: AppData): Promise<void> {
    await this.state.put({ id: "main", data, updatedAt: new Date().toISOString() });
  }

  async export(): Promise<string> {
    return JSON.stringify({ app: "titia", exportedAt: new Date().toISOString(), data: await this.load() });
  }

  async restore(text: string): Promise<AppData> {
    const value = JSON.parse(text) as { app?: string; data?: AppData };
    if (value.app !== "titia" || value.data?.version !== 1) throw new Error("这不是有效的 Titia 备份文件");
    await this.save(value.data);
    return value.data;
  }

  static balance(transactions: Transaction[], opening = 0): number {
    return transactions.filter((t) => t.reviewStatus === "confirmed").reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), opening);
  }
}

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
