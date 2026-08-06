import { scoreAmountCandidates, type AmountCandidate } from "./amountScoring";
import { classifyBill } from "./categoryRules";
import { findDuplicate } from "./duplicateDetection";
import { detectBillSource } from "./sourceRules";
import { today, uid, type AppData, type DuplicateCheck, type Transaction } from "./store";

export type ReviewDraft = {
  id: string;
  selected: boolean;
  type: "income" | "expense";
  amount: number | null;
  amountCandidates: AmountCandidate[];
  needsAmountChoice: boolean;
  category: string;
  subcategory: string;
  needsCategoryReview: boolean;
  merchant: string;
  accountId: string;
  date: string;
  sourceProvider: string;
  confidence: number;
  imageId?: string;
  duplicateCheck: DuplicateCheck;
  possibleDuplicate: boolean;
  rawText: string;
  valid: boolean;
};

export type ReviewBatch = { id: string; drafts: ReviewDraft[]; rawText: string; createdAt: string };

const datePattern = /\d{4}[年/.-]\d{1,2}[月/.-]\d{1,2}日?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/;
const amountAnchor = /实付|支付金额|付款金额|扣款金额|消费金额|入账金额|订单金额|商品金额|合计/;

function segments(text: string): string[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const anchored = lines.filter((line) => datePattern.test(line) && amountAnchor.test(line));
  return anchored.length >= 2 ? anchored : [lines.join("\n")];
}

function parseDate(text: string): string {
  const raw = text.match(datePattern)?.[0];
  if (!raw) return `${today()}T12:00:00`;
  const normalized = raw.replace(/[年月]/g, "-").replace(/日/g, "").replace(/\//g, "-");
  return normalized.includes(":") ? normalized.replace(" ", "T") : `${normalized}T12:00:00`;
}

function parseMerchant(text: string): string {
  const labelled = text.match(/(?:商户|商家|收款方|交易对象|商品)[：:]\s*([^\n\s]+)/)?.[1];
  if (labelled) return labelled;
  return text.split(/\r?\n/).map((line) => line.trim()).find((line) => line && !datePattern.test(line) && !amountAnchor.test(line) && !/微信|支付宝|支付成功|优惠/.test(line)) ?? "";
}

export function parseBillBatch({ text, attachmentId, data }: { text: string; attachmentId?: string; data: AppData }): ReviewBatch {
  const drafts = segments(text).map((segment) => {
    const source = detectBillSource(segment.includes("微信") || segment.includes("支付宝") ? segment : `${text}\n${segment}`);
    const scored = scoreAmountCandidates(segment);
    const merchant = parseMerchant(segment);
    const type: ReviewDraft["type"] = /退款|收入|入账|到账/.test(segment) ? "income" : "expense";
    const classification = classifyBill({ text: segment, merchant, provider: source.provider }, data.transactions);
    const accountId = data.accounts.find((account) => account.name.includes(source.accountHint) || source.accountHint.includes(account.name))?.id ?? data.accounts[0]?.id ?? "cash";
    const date = parseDate(segment);
    const amount = scored.candidates.find((candidate) => !candidate.excluded)?.amount ?? null;
    const duplicateCheck = amount ? findDuplicate({ amount, merchant, accountId, date, sourceProvider: source.provider }, data.transactions) : { possible: false, similarity: 0 };
    const needsCategoryReview = classification.matchedBy === "none";
    const valid = amount !== null && !scored.ambiguous;
    return {
      id: uid(), selected: valid && !duplicateCheck.possible, type, amount, amountCandidates: scored.candidates,
      needsAmountChoice: scored.ambiguous, category: classification.category, subcategory: classification.subcategory,
      needsCategoryReview, merchant, accountId, date, sourceProvider: source.provider,
      confidence: Math.round(Math.min(source.confidence, scored.candidates[0]?.confidence ?? 0, classification.confidence) * 100) / 100,
      imageId: attachmentId, duplicateCheck, possibleDuplicate: duplicateCheck.possible, rawText: segment, valid,
    } satisfies ReviewDraft;
  });
  return { id: uid(), drafts, rawText: text, createdAt: new Date().toISOString() };
}

export function reviewDraftToTransaction(draft: ReviewDraft): Transaction {
  if (!draft.amount || draft.needsAmountChoice) throw new Error("请选择有效金额后再保存");
  const now = new Date().toISOString();
  return {
    id: uid(), amount: draft.amount, type: draft.type, category: draft.category, subcategory: draft.subcategory,
    merchant: draft.merchant, accountId: draft.accountId, date: draft.date, source: "ocr", sourceProvider: draft.sourceProvider,
    confidence: draft.confidence, imageId: draft.imageId, duplicateCheck: draft.duplicateCheck, note: draft.merchant,
    rawPayload: draft.rawText, reviewStatus: "confirmed", createdAt: now, updatedAt: now,
  };
}
