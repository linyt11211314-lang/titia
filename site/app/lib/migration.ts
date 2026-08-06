import { normalizeAppData, type AppData } from "./store";

export type MigrationAttachment = { id: string; transactionId: string; mime: string; data: string; createdAt: string };
export type MigrationBundle = { version: 1; createdAt: string; data: AppData; attachments: MigrationAttachment[] };
export type MigrationCounts = { diaries: number; sparks: number; relationships: number; petRecords: number; todos: number; shopping: number; transactions: number; images: number; total: number };
export type MergeResult = { bundle: MigrationBundle; added: number; skipped: number };

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
};
const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};
const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
};
const transform = async (bytes: Uint8Array, mode: "compress" | "decompress") => {
  const source = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes); controller.close(); } });
  const stream = source.pipeThrough(mode === "compress" ? new CompressionStream("gzip") : new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

export async function encodeMigrationBundle(bundle: MigrationBundle): Promise<string> {
  const compressed = await transform(encoder.encode(JSON.stringify(bundle)), "compress");
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, compressed));
  return `titia-v1.${toBase64Url(concat(rawKey, iv, ciphertext))}`;
}

export async function decodeMigrationFragment(fragment: string): Promise<MigrationBundle> {
  const value = fragment.replace(/^#/, "");
  if (!value.startsWith("titia-v1.")) throw new Error("不支持的 Titia 迁移链接");
  const packed = fromBase64Url(value.slice("titia-v1.".length));
  if (packed.length < 61) throw new Error("迁移数据不完整");
  const rawKey = packed.slice(0, 32); const iv = packed.slice(32, 44); const ciphertext = packed.slice(44);
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
  const compressed = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext));
  const parsed = JSON.parse(decoder.decode(await transform(compressed, "decompress"))) as MigrationBundle;
  if (parsed.version !== 1 || !parsed.data || !Array.isArray(parsed.attachments)) throw new Error("迁移数据格式无效");
  return { ...parsed, data: normalizeAppData(parsed.data) };
}

export function buildMigrationUrl(encoded: string, location: Pick<Location, "origin" | "pathname">): string {
  const root = location.pathname.endsWith("/") ? location.pathname : `${location.pathname.replace(/[^/]*$/, "")}`;
  return `${location.origin}${root}import#${encoded}`;
}

export const canEncodeMigrationQr = (url: string) => encoder.encode(url).byteLength <= 2200;

export function migrationCounts(bundle: MigrationBundle): MigrationCounts {
  const data = bundle.data;
  const images = bundle.attachments.length + data.diaries.filter((item) => item.image).length + data.petRecords.filter((item) => item.image).length;
  const result = { diaries: data.diaries.length, sparks: data.sparks.length, relationships: data.relationships.length, petRecords: data.petRecords.length, todos: data.todos.length, shopping: data.shopping.length, transactions: data.transactions.length, images };
  return { ...result, total: Object.values(result).reduce((sum, count) => sum + count, 0) };
}

const arrayKeys: (keyof AppData)[] = ["todos", "shopping", "countdowns", "periods", "pets", "petRecords", "diaries", "relationships", "accounts", "transactions", "budgets", "ledgerCategories", "vault", "sparks"];
export function mergeMigrationBundle(current: MigrationBundle, incoming: MigrationBundle): MergeResult {
  const data = { ...current.data } as AppData;
  let added = 0; let skipped = 0;
  for (const key of arrayKeys) {
    const currentRows = data[key] as { id: string }[];
    const incomingRows = incoming.data[key] as { id: string }[];
    const ids = new Set(currentRows.map((row) => row.id));
    const fresh = incomingRows.filter((row) => { if (ids.has(row.id)) { skipped += 1; return false; } ids.add(row.id); added += 1; return true; });
    (data as unknown as Record<string, unknown>)[key] = [...currentRows, ...fresh];
  }
  const attachmentIds = new Set(current.attachments.map((item) => item.id));
  const attachments = [...current.attachments];
  for (const attachment of incoming.attachments) {
    if (attachmentIds.has(attachment.id)) skipped += 1;
    else { attachmentIds.add(attachment.id); attachments.push(attachment); added += 1; }
  }
  return { bundle: { version: 1, createdAt: new Date().toISOString(), data: normalizeAppData(data), attachments }, added, skipped };
}
