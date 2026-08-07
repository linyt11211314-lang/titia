import { useState } from "react";

export type CardSelectOption = { value: string; label: string; group?: string };
type Props = { label: string; name?: string; options: CardSelectOption[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; placeholder?: string };

export function CardSelect({ label, name, options, value, defaultValue, onChange, placeholder = "请选择" }: Props) {
  const [internal, setInternal] = useState(defaultValue ?? options[0]?.value ?? "");
  const [open, setOpen] = useState(false);
  const selected = value ?? internal;
  const choose = (next: string) => { setInternal(next); onChange?.(next); setOpen(false); };
  const groups = [...new Set(options.map((option) => option.group ?? ""))];
  return <div className="card-select-field"><span>{label}</span><button type="button" className="category-picker-trigger" onClick={() => setOpen(true)}>{options.find((option) => option.value === selected)?.label ?? placeholder} ›</button>{name&&<input aria-label={label} name={name} type="hidden" value={selected}/>} {open&&<div className="category-picker-panel" role="dialog" aria-label={`选择${label}`}><header><h3>选择{label}</h3><button type="button" onClick={() => setOpen(false)}>取消</button></header>{groups.map((group) => <section key={group||"options"}>{group&&<b>{group}</b>}<div>{options.filter((option) => (option.group ?? "") === group).map((option) => <button type="button" className={option.value===selected?"active":""} key={`${group}-${option.value}`} onClick={() => choose(option.value)}>{option.label}</button>)}</div></section>)}</div>}</div>;
}
