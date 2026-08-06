import { useState } from "react";
import { groupTransactionsByLocalDate } from "../lib/transactionGroups";
import type { Account, Transaction } from "../lib/store";

type Props = { transactions: Transaction[]; accounts: Account[]; onDelete: (transaction: Transaction) => void; onOpenAttachment: (transaction: Transaction) => void };
const money = (value: number) => new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(value);

export function GroupedTransactions({ transactions, accounts, onDelete, onOpenAttachment }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const groups = groupTransactionsByLocalDate(transactions);
  const toggle = (date: string) => setOpen((current) => { const next = new Set(current); if (next.has(date)) next.delete(date); else next.add(date); return next; });
  if (!groups.length) return <div className="card empty"><h3>账本还是空的</h3><p>记下第一笔收支</p></div>;
  return <div className="transaction-groups">{groups.map((group) => {
    const date = new Date(`${group.date}T12:00:00`);
    const label = `${date.getMonth() + 1}月${date.getDate()}日`;
    const expanded = open.has(group.date);
    return <section className="card transaction-day" key={group.date}>
      <button className="transaction-day-summary" aria-expanded={expanded} onClick={() => toggle(group.date)}>
        <span><b>{label}</b><small>{group.count} 笔 · {expanded ? "收起" : "展开"}</small></span>
        <span><small>当日支出</small><b className="expense">-{money(group.expense)}</b></span>
        {group.income > 0 && <span><small>当日收入</small><b className="income">+{money(group.income)}</b></span>}
      </button>
      {expanded && <div className="transaction-day-rows">{group.transactions.map((transaction) => <article className="transaction-row" key={transaction.id}>
        <span className={`transaction-glyph ${transaction.type}`}>{transaction.category.slice(0, 1)}</span>
        <div><b>{transaction.merchant || transaction.note || transaction.category}</b><small>{transaction.category}{transaction.subcategory ? ` / ${transaction.subcategory}` : ""} · {accounts.find((account) => account.id === transaction.accountId)?.name ?? "未指定账户"}</small></div>
        <strong className={transaction.type}>{transaction.type === "income" ? "+" : "-"}{money(transaction.amount)}</strong>
        <div className="transaction-actions">{transaction.imageId && <button aria-label={`查看${transaction.merchant || transaction.category}原图`} onClick={() => onOpenAttachment(transaction)}>原图</button>}<button aria-label={`删除${transaction.merchant || transaction.category}账单`} onClick={() => window.confirm("删除后账户余额将自动回滚，确定继续吗？") && onDelete(transaction)}>删除</button></div>
      </article>)}</div>}
    </section>;
  })}</div>;
}
