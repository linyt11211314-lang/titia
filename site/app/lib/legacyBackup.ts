import { emptyData, normalizeAppData, type AppData, type LedgerCategory } from "./store";

type Row = Record<string, unknown>;
type LegacyBackup = { version: number; exportedAt?: number; tables: Record<string, Row[]> };

const rows = (tables: Record<string, Row[]>, name: string) => Array.isArray(tables[name])
  ? tables[name].filter((row) => !row.deletedAt)
  : [];
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const number = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const iso = (value: unknown) => {
  if (typeof value === "number") return new Date(value).toISOString();
  if (typeof value === "string" && value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  return new Date().toISOString();
};
const day = (value: unknown) => iso(value).slice(0, 10);
const payload = (row: Row) => row.payload && typeof row.payload === "object" ? row.payload as Row : {};

export function isLegacyBackup(value: unknown): value is LegacyBackup {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LegacyBackup>;
  return candidate.version === 1 && Boolean(candidate.tables && typeof candidate.tables === "object" && Array.isArray(candidate.tables.records));
}

export function convertLegacyBackup(value: unknown): { data: AppData; mediaCount: number; warnings: string[] } {
  if (!isLegacyBackup(value)) throw new Error("不是可识别的旧版 Titia 备份");
  const tables = value.tables;
  const data = emptyData();
  const warnings: string[] = [];
  const media = new Map(rows(tables, "media").map((row) => [text(row.id), text(row.blob) || text(row.thumb)]));
  const firstImage = (row: Row) => {
    const ids = Array.isArray(row.mediaIds) ? row.mediaIds : [];
    return ids.map(String).map((id) => media.get(id)).find(Boolean);
  };
  const records = rows(tables, "records");

  data.diaries = records.filter((row) => row.type === "diary").map((row) => ({
    id: text(row.id), title: text(row.title, text(row.content).slice(0, 24) || "旧日记"), body: text(row.content),
    mood: text(payload(row).mood, "平静"), date: day(row.occurredAt ?? row.createdAt), image: firstImage(row),
  }));
  data.sparks = records.filter((row) => row.type === "spark").map((row) => ({
    id: text(row.id), tag: text(payload(row).category, "备忘录"), body: text(row.content), date: iso(row.occurredAt ?? row.createdAt),
  }));
  data.relationships = records.filter((row) => String(row.type).startsWith("relation_")).map((row) => {
    const extra = payload(row);
    return { id: text(row.id), type: row.type === "relation_conflict" ? "review" as const : "moment" as const,
      person: text(extra.person), title: text(extra.event, text(row.content).slice(0, 24) || "关系记录"), body: text(row.content),
      reflection: [text(extra.whyMoved), text(extra.wordsToSay)].filter(Boolean).join("\n"), date: day(row.occurredAt ?? row.createdAt) };
  });
  data.pets = rows(tables, "pets").map((row) => ({ id: text(row.id), name: text(row.name), breed: text(row.breed), birthday: day(row.birthday), sex: text(row.gender, "未知") }));
  data.petRecords = [
    ...records.filter((row) => row.type === "pet_moment").map((row) => ({ id: text(row.id), petId: text(row.refType), kind: "moment" as const, date: day(row.occurredAt ?? row.createdAt), value: text(row.content).slice(0, 30), note: text(row.content), image: firstImage(row) })),
    ...rows(tables, "petHealth").map((row) => ({ id: text(row.id), petId: text(row.petId), kind: row.kind === "weight" ? "weight" as const : "health" as const, date: day(row.date ?? row.createdAt), value: text(row.value), note: text(row.note, text(row.kind)) })),
  ];
  data.todos = rows(tables, "todos").map((row) => ({ id: text(row.id), text: text(row.title), done: Boolean(row.done), createdAt: iso(row.createdAt) }));
  data.shopping = rows(tables, "shopping").map((row) => ({ id: text(row.id), text: text(row.name), bought: Boolean(row.bought ?? row.status === "bought"), createdAt: iso(row.createdAt) }));
  data.countdowns = rows(tables, "countdownEvents").map((row) => ({ id: text(row.id), title: text(row.title), date: text(row.solarDate), category: text(row.category, text(row.kind, "其他")), repeat: Boolean(row.repeat ?? true), calendar: row.dateType === "lunar" ? "lunar" as const : "solar" as const, createdAt: iso(row.createdAt) }));
  data.periods = rows(tables, "cycles").map((row) => ({ id: text(row.id), start: day(row.startDate), end: row.endDate ? day(row.endDate) : undefined, note: text(row.note) }));
  data.accounts = rows(tables, "accounts").map((row) => ({ id: text(row.id), name: text(row.name), opening: number(row.opening ?? row.balance), kind: text(row.kind, text(row.type, "账户")) }));
  if (!data.accounts.length) data.accounts = emptyData().accounts;
  data.transactions = rows(tables, "transactions").map((row) => {
    const createdAt = iso(row.createdAt ?? row.time);
    return { id: text(row.id), type: row.txType === "income" ? "income" as const : "expense" as const, amount: Math.abs(number(row.amount)), category: text(row.category, "其他"), subcategory: "", merchant: "", accountId: text(row.account, data.accounts[0]?.id ?? "cash"), date: day(row.time ?? row.createdAt), note: text(row.note), source: "import" as const, sourceProvider: text(row.source), reviewStatus: "confirmed" as const, createdAt, updatedAt: iso(row.updatedAt ?? createdAt) };
  });
  data.budgets = rows(tables, "budgets").map((row) => ({ id: text(row.id), category: text(row.category), amount: number(row.amount), month: text(row.period).slice(0, 7) || day(row.createdAt).slice(0, 7) }));
  const legacyCategories = rows(tables, "categories");
  if (legacyCategories.length) {
    const mapped = legacyCategories.filter((row) => text(row.name)).map((row): LedgerCategory => ({ id: text(row.id), name: text(row.name), type: row.side === "income" || row.type === "income" ? "income" : "expense", parentId: text(row.parentId) || undefined }));
    data.ledgerCategories = mapped;
    data.categories = mapped.map((category) => category.name);
  }
  const meta = rows(tables, "vaultMeta")[0];
  if (meta && text(meta.verifierIv)) data.vaultMeta = { salt: text(meta.salt), verifier: text(meta.verifier), verifierIv: text(meta.verifierIv) };
  else if (meta) warnings.push("旧版密码箱加密参数已保留在备份中，但需原版本主密码机制才能解锁");
  data.vault = rows(tables, "vaultItems").map((row) => ({ id: text(row.id), title: text(row.name), ciphertext: text(row.secret), iv: text(row.iv), createdAt: iso(row.createdAt) }));
  return { data: normalizeAppData(data), mediaCount: media.size, warnings };
}
