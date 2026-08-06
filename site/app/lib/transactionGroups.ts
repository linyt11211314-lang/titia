import type { Transaction } from "./store";

export type TransactionGroup = { date: string; income: number; expense: number; count: number; transactions: Transaction[] };

export function groupTransactionsByLocalDate(transactions: Transaction[]): TransactionGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const transaction of transactions.filter((item) => item.reviewStatus === "confirmed")) {
    const date = transaction.date.slice(0, 10);
    map.set(date, [...(map.get(date) ?? []), transaction]);
  }
  return [...map.entries()].sort(([left], [right]) => right.localeCompare(left)).map(([date, items]) => {
    const sorted = [...items].sort((left, right) => right.date.localeCompare(left.date));
    return {
      date,
      income: sorted.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0),
      expense: sorted.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0),
      count: sorted.length,
      transactions: sorted,
    };
  });
}
