import { useState } from "react";

export type CardSelectOption = { value: string; label: string; group?: string };
type Props = { label: string; name?: string; options: CardSelectOption[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; placeholder?: string };

export function CardSelect({ label, name, options, value, defaultValue, onChange, placeholder = "请选择" }: Props) {
  const [internal, setInternal] = useState(defaultValue ?? options[0]?.value ?? "");
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const selected = value ?? internal;
  const choose = (next: string) => { setInternal(next); onChange?.(next); setOpen(false); setActiveGroup(null); };
  const groups = [...new Set(options.map((option) => option.group).filter((group): group is string => Boolean(group)))];
  const grouped = groups.length > 0;
  const openPicker = () => { setActiveGroup(null); setOpen(true); };
  return <div className="card-select-field"><span>{label}</span><button type="button" className="category-picker-trigger" onClick={openPicker}>{options.find((option) => option.value === selected)?.label ?? placeholder} ›</button>{name&&<input aria-label={label} name={name} type="hidden" value={selected}/>} {open&&<div className="category-picker-panel" role="dialog" aria-label={`选择${label}`}><header><div>{activeGroup&&<button type="button" className="picker-back" onClick={() => setActiveGroup(null)}>‹ 一级分类</button>}<h3>{activeGroup||`选择${label}`}</h3></div><button type="button" onClick={() => { setOpen(false); setActiveGroup(null); }}>取消</button></header>{grouped&&!activeGroup?<section><b>一级分类</b><div className="picker-primary-grid">{groups.map((group) => <button type="button" key={group} onClick={() => setActiveGroup(group)}>{group}<small>进入选择</small></button>)}</div></section>:<section><b>{activeGroup?"二级分类":label}</b><div>{options.filter((option) => !grouped || option.group === activeGroup).map((option) => <button type="button" className={option.value===selected?"active":""} key={`${option.group||"options"}-${option.value}`} onClick={() => choose(option.value)}>{option.label}</button>)}</div></section>}</div>}</div>;
}
