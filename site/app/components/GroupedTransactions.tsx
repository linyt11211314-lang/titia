import { useRef, useState } from "react";
import { groupTransactionsByLocalDate } from "../lib/transactionGroups";
import type { Account, LedgerCategory, Transaction } from "../lib/store";
import { CardSelect } from "./CardSelect";

type Props = { transactions: Transaction[]; accounts: Account[]; categories?: LedgerCategory[]; onDelete: (transaction: Transaction) => void; onOpenAttachment: (transaction: Transaction) => void; onBatchDelete?: (ids: string[]) => void; onBatchCategory?: (ids: string[], category: string) => void; onBatchAccount?: (ids: string[], accountId: string) => void };
const money = (value: number) => new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(value);
const normalizedCategoryName=(value:string)=>value.replace(/收入|支出|分类|\s/g,"");
function categoryDisplay(transaction:Transaction,categories:LedgerCategory[]){
  const rawCategory=transaction.category?.trim()||"未分类";
  const rawSubcategory=transaction.subcategory?.trim()||"";
  const target=normalizedCategoryName(rawSubcategory||rawCategory);
  const leaf=categories.find(item=>item.type===transaction.type&&item.parentId&&normalizedCategoryName(item.name)===target);
  const parent=leaf?categories.find(item=>item.id===leaf.parentId):categories.find(item=>item.type===transaction.type&&!item.parentId&&item.name===rawCategory);
  const primary=parent?.name||(transaction.type==="income"?"收入":rawCategory);
  const secondary=leaf?.name||rawSubcategory||(primary!==rawCategory?rawCategory:"");
  return {label:[primary,secondary].filter((value,index,all)=>value&&all.indexOf(value)===index).join(" / "),glyph:primary.slice(0,1)};
}

export function GroupedTransactions({ transactions, accounts, categories = [], onDelete, onOpenAttachment, onBatchDelete, onBatchCategory, onBatchAccount }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const timer = useRef<number | null>(null);
  const groups = groupTransactionsByLocalDate(transactions);
  const toggle = (date: string) => setOpen((current) => { const next = new Set(current); if (next.has(date)) next.delete(date); else next.add(date); return next; });
  const toggleSelected=(id:string)=>setSelected(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next});
  const ids=[...selected];
  if (!groups.length) return <div className="card empty"><h3>账本还是空的</h3><p>记下第一笔收支</p></div>;
  return <div className="transaction-groups">
    <div className="batch-heading"><button className="secondary" onClick={()=>{setEditing(!editing);setSelected(new Set())}}>{editing?"退出编辑":"批量管理"}</button>{editing&&<small>已选 {selected.size} 笔 · 也可长按账单进入</small>}</div>
    {editing&&<div className="card batch-toolbar"><button disabled={!ids.length} onClick={()=>{if(confirm(`删除选中的 ${ids.length} 笔账单？账户余额会自动回滚。`)){onBatchDelete?.(ids);setSelected(new Set())}}}>批量删除</button><CardSelect label="批量修改分类" value="" onChange={value=>{if(value&&ids.length)onBatchCategory?.(ids,value)}} options={[{value:"",label:"修改分类"},...categories.filter(item=>item.parentId).map(item=>({value:item.name,label:item.name}))]}/><CardSelect label="批量修改账户" value="" onChange={value=>{if(value&&ids.length)onBatchAccount?.(ids,value)}} options={[{value:"",label:"修改账户"},...accounts.map(item=>({value:item.id,label:item.name}))]}/></div>}
    {groups.map((group) => { const date = new Date(`${group.date}T12:00:00`); const label = `${date.getMonth() + 1}月${date.getDate()}日`; const expanded = open.has(group.date); return <section className="card transaction-day" key={group.date}>
      <button className="transaction-day-summary" aria-expanded={expanded} onClick={() => toggle(group.date)}><span><b>{label}</b><small>{group.count} 笔 · {expanded ? "收起" : "展开"}</small></span><span><small>当日支出</small><b className="expense">-{money(group.expense)}</b></span>{group.income > 0 && <span><small>当日收入</small><b className="income">+{money(group.income)}</b></span>}</button>
      {expanded && <div className="transaction-day-rows">{group.transactions.map((transaction) => {const category=categoryDisplay(transaction,categories);return <article className={`transaction-row ${selected.has(transaction.id)?"selected":""}`} key={transaction.id} onPointerDown={()=>{timer.current=window.setTimeout(()=>{setEditing(true);toggleSelected(transaction.id)},650)}} onPointerUp={()=>{if(timer.current)window.clearTimeout(timer.current)}} onPointerCancel={()=>{if(timer.current)window.clearTimeout(timer.current)}}>
        {editing&&<button className={`batch-check ${selected.has(transaction.id)?"active":""}`} aria-label={`选择${transaction.merchant || transaction.category}`} onClick={()=>toggleSelected(transaction.id)}>{selected.has(transaction.id)?"✓":""}</button>}<span className={`transaction-glyph ${transaction.type}`}>{category.glyph}</span><div><b>{transaction.merchant || transaction.note || transaction.category}</b><small>{category.label} · {accounts.find((account) => account.id === transaction.accountId)?.name ?? "未指定账户"}</small></div><strong className={transaction.type}>{transaction.type === "income" ? "+" : "-"}{money(transaction.amount)}</strong>{!editing&&<div className="transaction-actions">{transaction.imageId && <button aria-label={`查看${transaction.merchant || transaction.category}原图`} onClick={() => onOpenAttachment(transaction)}>原图</button>}<button aria-label={`删除${transaction.merchant || transaction.category}账单`} onClick={() => window.confirm("删除后账户余额将自动回滚，确定继续吗？") && onDelete(transaction)}>删除</button></div>}
      </article>})}</div>}
    </section>})}
  </div>;
}
