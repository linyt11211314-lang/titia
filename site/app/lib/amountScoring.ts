export type AmountCandidate = { amount: number; score: number; confidence: number; label: string; excluded: boolean; evidence: string };
export type AmountScoreResult = { candidates: AmountCandidate[]; ambiguous: boolean };

const preferred = ["实付款", "实际支付", "实付金额", "支付金额", "付款金额", "扣款金额", "消费金额", "入账金额"];
const secondary = ["订单金额", "商品金额", "合计", "金额"];
const excludedLabels = ["优惠", "减免", "红包", "余额", "累计", "总资产", "原价"];

export function scoreAmountCandidates(text: string): AmountScoreResult {
  const collected: AmountCandidate[] = [];
  for (const line of text.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)) {
    const matches = [...line.matchAll(/(?:¥|￥)?\s*(-?\d[\d,]*(?:\.\d{1,2})?)\s*(?:元)?/g)];
    for (const match of matches) {
      const amount = Math.abs(Number(match[1].replace(/,/g, "")));
      if (!Number.isFinite(amount) || amount === 0) continue;
      const excluded = excludedLabels.some((label) => line.includes(label));
      const high = preferred.find((label) => line.includes(label));
      const medium = secondary.find((label) => line.includes(label));
      const label = high ?? medium ?? excludedLabels.find((value) => line.includes(value)) ?? "未知金额";
      const score = excluded ? 5 : high ? 100 : medium ? 65 : 35;
      collected.push({ amount, score, confidence: score / 100, label, excluded, evidence: line });
    }
  }
  const candidates = [...new Map(collected.sort((a, b) => b.score - a.score).map((item) => [item.amount, item])).values()].sort((a, b) => b.score - a.score);
  const plausible = candidates.filter((item) => !item.excluded);
  const ambiguous = plausible.length > 1 && plausible[0].score - plausible[1].score < 20;
  return { candidates, ambiguous };
}
