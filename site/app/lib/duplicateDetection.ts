import type { DuplicateCheck, Transaction } from "./store";

type Candidate = Pick<Transaction, "amount" | "accountId" | "date"> & Partial<Pick<Transaction, "merchant" | "sourceProvider">>;

const sameMerchant = (left = "", right = "") => left === right ? 1 : left.includes(right) || right.includes(left) ? 0.8 : 0;

export function findDuplicate(candidate: Candidate, transactions: Transaction[]): DuplicateCheck {
  let best = { similarity: 0, matchedTransactionId: undefined as string | undefined };
  for (const transaction of transactions.filter((item) => item.reviewStatus === "confirmed")) {
    const hours = Math.abs(new Date(candidate.date).getTime() - new Date(transaction.date).getTime()) / 3_600_000;
    const dateScore = hours <= 2 ? 1 : hours <= 24 ? 0.8 : hours <= 72 ? 0.35 : 0;
    const amountScore = Math.abs(candidate.amount - transaction.amount) < 0.01 ? 1 : 0;
    const merchantScore = sameMerchant(candidate.merchant, transaction.merchant);
    const accountScore = candidate.accountId === transaction.accountId ? 1 : 0.45;
    const providerScore = candidate.sourceProvider && candidate.sourceProvider === transaction.sourceProvider ? 1 : 0.5;
    const similarity = amountScore * 0.38 + dateScore * 0.27 + merchantScore * 0.2 + accountScore * 0.1 + providerScore * 0.05;
    if (similarity > best.similarity) best = { similarity, matchedTransactionId: transaction.id };
  }
  const similarity = Math.round(best.similarity * 100) / 100;
  return { possible: similarity >= 0.78, similarity, matchedTransactionId: best.matchedTransactionId };
}
