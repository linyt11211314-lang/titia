import { useState } from "react";
import type { ReviewBatch, ReviewDraft } from "../lib/billParser";
import type { Account, LedgerCategory } from "../lib/store";
import { CardSelect } from "./CardSelect";

type Props = {
  batch: ReviewBatch;
  accounts: Account[];
  categories: LedgerCategory[];
  imageUrl?: string;
  onChange: (draft: ReviewDraft) => void;
  onDelete?: (id: string) => void;
  onSave: (ids: string[]) => void;
  onReparse: () => void;
};

const money = (value: number) => `¥${value.toFixed(2)}`;

export function LedgerReview({ batch, accounts, categories, imageUrl, onChange, onDelete, onSave, onReparse }: Props) {
  const [drafts, setDrafts] = useState(batch.drafts);
  const update = (id: string, patch: Partial<ReviewDraft>) => {
    setDrafts((current) => current.map((draft) => {
      if (draft.id !== id) return draft;
      const next = { ...draft, ...patch };
      onChange(next);
      return next;
    }));
  };
  const remove = (id: string) => {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
    onDelete?.(id);
  };
  const selectable = drafts.filter((draft) => draft.valid && !draft.needsAmountChoice);
  const selected = selectable.filter((draft) => draft.selected).map((draft) => draft.id);
  const categoryOptions = (draft: ReviewDraft) => {
    const options=categories.filter((category) => category.parentId && category.type === draft.type).map((category)=>({value:category.name,label:category.name,group:categories.find((parent)=>parent.id===category.parentId)?.name}));
    return draft.subcategory&&!options.some((option)=>option.value===draft.subcategory)?[...options,{value:draft.subcategory,label:draft.subcategory,group:draft.category||"其他"}]:options;
  };

  return <section className="ledger-review" aria-label="智能审核">
    <header className="review-heading">
      <div><small>本地智能识别</small><h2>智能审核</h2><p>共 {drafts.length} 笔候选，确认后才写入账本</p></div>
      <button className="secondary" onClick={onReparse}>重新识别</button>
    </header>
    {imageUrl && <details className="receipt-image"><summary>查看原截图</summary><img src={imageUrl} alt="账单原图" /></details>}
    <div className="review-batch-actions">
      <button className="secondary" onClick={() => selectable.forEach((draft) => update(draft.id, { selected: true }))}>全选可保存项</button>
      <button className="secondary" onClick={() => drafts.forEach((draft) => update(draft.id, { selected: false }))}>取消全选</button>
    </div>
    {drafts.map((draft, index) => <article className={`card review-draft ${draft.possibleDuplicate ? "duplicate" : ""}`} key={draft.id}>
      <div className="review-draft-title">
        <label><input aria-label={`选择 ${draft.merchant || `账单${index + 1}`}`} type="checkbox" checked={draft.selected} disabled={!draft.valid || draft.needsAmountChoice} onChange={(event) => update(draft.id, { selected: event.target.checked })} />候选 {index + 1}</label>
        <b>{draft.type === "income" ? "收入" : "支出"} {draft.amount ? money(draft.amount) : "金额待确认"}</b>
        <button className="text-button" onClick={() => remove(draft.id)}>删除草稿</button>
      </div>
      {draft.needsAmountChoice && <div className="amount-choice"><strong>发现多个金额，请选择</strong>{draft.amountCandidates.filter((item) => !item.excluded).map((candidate) => <button key={candidate.amount} onClick={() => update(draft.id, { amount: candidate.amount, needsAmountChoice: false, valid: true, selected: true })}>{money(candidate.amount)} · {Math.round(candidate.confidence * 100)}%</button>)}</div>}
      {draft.possibleDuplicate && <p className="duplicate-warning">可能重复账单 · 相似度 {Math.round(draft.duplicateCheck.similarity * 100)}%（仍可手动选择添加）</p>}
      <div className="review-fields">
        <label>商户<input value={draft.merchant} onChange={(event) => update(draft.id, { merchant: event.target.value })} /></label>
        <CardSelect label="类型" value={draft.type} onChange={(value) => update(draft.id, { type: value as ReviewDraft["type"] })} options={[{value:"expense",label:"支出"},{value:"income",label:"收入"}]}/>
        <CardSelect label="一级 / 二级分类" value={draft.subcategory} onChange={(value) => {const selected=categories.find((category)=>category.type===draft.type&&category.parentId&&category.name===value);const parent=categories.find((category)=>category.id===selected?.parentId);update(draft.id, { category:parent?.name||draft.category,subcategory:value,needsCategoryReview:false });}} options={categoryOptions(draft)}/>
        <CardSelect label="账户" value={draft.accountId} onChange={(value) => update(draft.id, { accountId: value })} options={accounts.map(account=>({value:account.id,label:account.name}))}/>
        <label>时间<input type="datetime-local" value={draft.date.slice(0, 16)} onChange={(event) => update(draft.id, { date: event.target.value })} /></label>
      </div>
      <p className="confidence">可信度：{Math.round(draft.confidence * 100)}% · 来源：{draft.sourceProvider || "未知"}</p>
    </article>)}
    <button className="primary full" disabled={!selected.length} onClick={() => onSave(selected)}>保存选中账单</button>
  </section>;
}
