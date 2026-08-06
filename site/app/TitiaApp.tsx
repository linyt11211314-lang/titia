"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, jsx-a11y/no-static-element-interactions */

import { useEffect, useRef, useState } from "react";
import { BookHeart, CalendarDays, Cat, Check, ChevronRight, Clock3, Download, Feather, Heart, Home, ListChecks, LockKeyhole, Menu, NotebookTabs, Plus, Settings, ShieldCheck, ShoppingCart, Sparkles, Trash2, Upload, UserRound, WalletCards, X } from "lucide-react";
import { createVault, decryptText, emptyData, encryptText, store, today, TitiaStore, uid, unlockVault, type AppData, type Transaction, type VaultEntry } from "./lib/store";
import { analysisSummary, assetSummary, categorySummary, dataSummary, ledgerSummary } from "./lib/ledger";
import { buildLedgerWorkbook, buildTransactionCsv, parseLedgerWorkbook } from "./lib/spreadsheet";
import { parseBillBatch, reviewDraftToTransaction, type ReviewBatch, type ReviewDraft } from "./lib/billParser";
import { LedgerReview } from "./components/LedgerReview";
import { GroupedTransactions } from "./components/GroupedTransactions";
import { recognizeImageLocally } from "./lib/localOcr";
import { DataManagement } from "./components/DataManagement";
import { clampFloatingPosition } from "./lib/floatingButton";
import { buildPeriodCalendar, countdownStatus } from "./lib/lifeDates";
import { addLedgerCategory, deleteLedgerCategory, groupAccounts, leafCategoryNames, renameLedgerCategory } from "./lib/ledgerManagement";
import { SparkFullscreen } from "./components/SparkFullscreen";

type MainTab = "today" | "home" | "ledger" | "time" | "me";
type FormKind = "todo" | "shopping" | "countdown" | "period" | "pet" | "petRecord" | "diary" | "relationship" | "transaction" | "account" | "budget" | "vault" | "spark" | null;
const mainTabs: { id: MainTab; label: string; icon: typeof Home }[] = [
  { id: "today", label: "今日", icon: Home }, { id: "home", label: "小窝", icon: Menu },
  { id: "ledger", label: "小账", icon: NotebookTabs }, { id: "time", label: "时光", icon: BookHeart },
  { id: "me", label: "我呀", icon: UserRound },
];
const homeSections = ["倒数日", "购物", "周期", "憨憨", "密码箱"] as const;
const ledgerSections = ["首页", "账单", "资产", "分析", "分类", "导入导出", "AI识别"] as const;
const timeSections = ["日记", "关系"] as const;
const homeIcons: Record<(typeof homeSections)[number], string> = { 倒数日: "⏰", 购物: "🛒", 周期: "🌙", 憨憨: "🐱", 密码箱: "🔐" };
const ledgerIcons: Record<(typeof ledgerSections)[number], string> = { 首页: "🏠", 账单: "🧾", 资产: "💰", 分析: "📊", 分类: "🗂️", 导入导出: "📥", AI识别: "✨" };
const timeIcons: Record<(typeof timeSections)[number], string> = { 日记: "📖", 关系: "💙" };
const sessionDay = today();
const money = (value: number) => new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(value);

export function TitiaApp() {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<MainTab>("today");
  const [homeSection, setHomeSection] = useState<(typeof homeSections)[number]>("倒数日");
  const [ledgerSection, setLedgerSection] = useState<(typeof ledgerSections)[number]>("首页");
  const [timeSection, setTimeSection] = useState<(typeof timeSections)[number]>("日记");
  const [form, setForm] = useState<FormKind>(null);
  const [toast, setToast] = useState("");
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [vaultVisible, setVaultVisible] = useState<Record<string, { username: string; password: string }>>({});
  const [vaultAccessOpen, setVaultAccessOpen] = useState(false);
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultConfirm, setVaultConfirm] = useState("");
  const [sparkEditing, setSparkEditing] = useState(false);
  const [sparkSettingsOpen, setSparkSettingsOpen] = useState(false);
  const [sparkFullscreen, setSparkFullscreen] = useState(false);
  const [sparkDraft, setSparkDraft] = useState({ x: null as number | null, y: null as number | null, opacity: 0.8 });
  const sparkTimer = useRef<number | null>(null);
  const sparkLongPressed = useRef(false);
  const sparkDragging = useRef(false);
  const sparkSuppressClick = useRef(false);
  const sparkPointerStart = useRef<{x:number;y:number}|null>(null);
  const sparkPointerOffset = useRef<{x:number;y:number}>({x:29,y:29});
  const sparkPositionRef = useRef<{x:number|null;y:number|null}>({x:null,y:null});

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2200); };
  useEffect(() => { store.load().then((value) => { setData(value); setReady(true); }); }, []);
  useEffect(() => { if (ready) store.save(data).catch(() => notify("保存失败，请检查存储空间")); }, [data, ready]);
  const update = (fn: (draft: AppData) => AppData, message = "已保存") => { setData(fn); notify(message); };
  const remove = (collection: keyof AppData, id: string) => {
    if (!confirm("确认永久删除这条记录吗？")) return;
    setData((current) => ({ ...current, [collection]: (current[collection] as { id: string }[]).filter((item) => item.id !== id) }));
    notify("已删除");
  };

  const addFromForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const now = new Date().toISOString();
    const text = String(values.text || "").trim();
    if (form === "todo" && text) update((d) => ({ ...d, todos: [{ id: uid(), text, done: false, createdAt: now }, ...d.todos] }));
    if (form === "shopping" && text) update((d) => ({ ...d, shopping: [{ id: uid(), text, bought: false, createdAt: now }, ...d.shopping] }));
    if (form === "countdown") update((d) => ({ ...d, countdowns: [{ id: uid(), title: String(values.title), date: String(values.date), category: String(values.category), repeat: values.repeat === "on", calendar: String(values.calendar) === "lunar" ? "lunar" : "solar", createdAt: now }, ...d.countdowns] }));
    if (form === "period") update((d) => ({ ...d, periods: [{ id: uid(), start: String(values.start), end: String(values.end || ""), note: String(values.note || "") }, ...d.periods] }));
    if (form === "pet") update((d) => ({ ...d, pets: [{ id: uid(), name: String(values.name), breed: String(values.breed), birthday: String(values.birthday), sex: String(values.sex) }, ...d.pets] }));
    if (form === "petRecord") update((d) => ({ ...d, petRecords: [{ id: uid(), petId: String(values.petId), kind: String(values.kind) as "moment", date: String(values.date), value: String(values.value || ""), note: String(values.note || "") }, ...d.petRecords] }));
    if (form === "diary") update((d) => ({ ...d, diaries: [{ id: uid(), title: String(values.title), body: String(values.body), mood: String(values.mood), date: String(values.date) }, ...d.diaries] }));
    if (form === "relationship") update((d) => ({ ...d, relationships: [{ id: uid(), type: String(values.type) as "moment", person: String(values.person), title: String(values.title), body: String(values.body), reflection: String(values.reflection || ""), date: String(values.date) }, ...d.relationships] }));
    if (form === "transaction") update((d) => ({ ...d, transactions: [{ id: uid(), type: String(values.type) as "expense", amount: Number(values.amount), category: String(values.category), accountId: String(values.accountId), date: String(values.date), note: String(values.note || ""), source: "manual", reviewStatus: "confirmed", createdAt: now, updatedAt: now }, ...d.transactions] }));
    if (form === "account") update((d) => ({ ...d, accounts: [...d.accounts, { id: uid(), name: String(values.name), opening: Number(values.opening), kind: String(values.kind) }] }));
    if (form === "budget") update((d) => ({ ...d, budgets: [...d.budgets.filter((b) => !(b.category === values.category && b.month === values.month)), { id: uid(), category: String(values.category), amount: Number(values.amount), month: String(values.month) }] }));
    if (form === "spark") { const id=uid(); const mediaId=uid(); const content=String(values.body); const tag=String(values.tag); const image=values.sparkImage instanceof File&&values.sparkImage.size?values.sparkImage:null; update((d) => ({ ...d, sparks: [{ id, tag, body: content, date: now }, ...d.sparks], sparkNotes: [{ id, title: String(values.title||content.slice(0,24)||"未命名灵光"), content, tag, images: image?[mediaId]:[], createdAt: now, updatedAt: now }, ...d.sparkNotes] })); if(image)await store.putSparkMedia({id:mediaId,sparkNoteId:id,image,createdAt:now}); }
    if (form === "vault" && vaultKey) {
      const encrypted = await encryptText(JSON.stringify({ username: values.username, password: values.password }), vaultKey);
      update((d) => ({ ...d, vault: [{ id: uid(), title: String(values.title), ...encrypted, createdAt: now }, ...d.vault] }));
    }
    setForm(null);
  };

  const setupOrUnlock = () => { setVaultPassword(""); setVaultConfirm(""); setVaultAccessOpen(true); };
  const submitVaultAccess = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!data.vaultMeta) {
        if (vaultPassword.length < 8) throw new Error("主密码至少需要 8 位");
        if (vaultPassword !== vaultConfirm) throw new Error("两次输入的密码不一致");
        const result = await createVault(vaultPassword);
        setData((d) => ({ ...d, vaultMeta: result.meta })); setVaultKey(result.key); notify("密码箱已创建");
      } else { setVaultKey(await unlockVault(vaultPassword, data.vaultMeta)); notify("已解锁"); }
      setVaultAccessOpen(false); setVaultPassword(""); setVaultConfirm("");
    } catch (error) { notify(error instanceof Error ? error.message : "无法解锁"); }
  };
  const revealVault = async (entry: VaultEntry) => {
    if (!vaultKey) return;
    try {
      const revealed = JSON.parse(await decryptText(entry.ciphertext, entry.iv, vaultKey));
      setVaultVisible((v) => ({ ...v, [entry.id]: revealed }));
    } catch { notify("解密失败"); }
  };

  const exportBackup = async () => {
    const blob = new Blob([await store.export()], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `titia-backup-${today()}.json`; link.click(); URL.revokeObjectURL(link.href); notify("备份已导出");
  };
  const page = tab === "today" ? <Today data={data} setData={setData} add={setForm} remove={remove} />
    : tab === "home" ? <HomeSpace data={data} section={homeSection} setSection={setHomeSection} setData={setData} add={setForm} remove={remove} vaultKey={vaultKey} setupOrUnlock={setupOrUnlock} revealVault={revealVault} visible={vaultVisible} />
    : tab === "ledger" ? <Ledger data={data} setData={setData} section={ledgerSection} setSection={setLedgerSection} add={setForm} remove={remove} notify={notify} />
    : tab === "time" ? <TimeSpace data={data} setData={setData} section={timeSection} setSection={setTimeSection} add={setForm} remove={remove} />
    : <Me data={data} setData={setData} exportBackup={exportBackup} notify={notify} />;

  if (!ready) return <main className="loading"><div className="cloud-logo">☁️</div><p>正在打开你的小世界…</p></main>;
  return <main className="app-shell">
    <div className="sky-orb orb-one"/><div className="sky-orb orb-two"/>
    <div className="page-frame">{page}</div>
    {!sparkFullscreen&&<button className={`spark-fab ${sparkEditing ? "editing" : ""}`} aria-label="灵光一闪"
      style={{ opacity: sparkEditing ? sparkDraft.opacity : data.userPreferences.floatingButton.opacity, ...(typeof (sparkEditing ? sparkDraft.x : data.userPreferences.floatingButton.x) === "number" ? { left: sparkEditing ? sparkDraft.x! : data.userPreferences.floatingButton.x!, top: sparkEditing ? sparkDraft.y! : data.userPreferences.floatingButton.y!, right: "auto", bottom: "auto" } : {}) }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        if (sparkTimer.current) window.clearTimeout(sparkTimer.current);
        sparkLongPressed.current = false;
        sparkDragging.current = false;
        sparkSuppressClick.current = false;
        sparkPointerStart.current = {x:event.clientX,y:event.clientY};
        const rect=event.currentTarget.getBoundingClientRect();
        sparkPointerOffset.current={x:event.clientX-rect.left,y:event.clientY-rect.top};
        sparkTimer.current = window.setTimeout(() => { if(sparkDragging.current)return;const initial={x:typeof data.userPreferences.floatingButton.x==="number"?data.userPreferences.floatingButton.x:rect.left,y:typeof data.userPreferences.floatingButton.y==="number"?data.userPreferences.floatingButton.y:rect.top,opacity:data.userPreferences.floatingButton.opacity};sparkLongPressed.current=true;sparkSuppressClick.current=true;setSparkDraft(initial);setSparkSettingsOpen(true); }, 1000);
      }}
      onPointerMove={(event) => {
        const start=sparkPointerStart.current;if(!start)return;
        if(!sparkDragging.current&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<8)return;
        if(!sparkDragging.current){sparkDragging.current=true;sparkSuppressClick.current=true;if(sparkTimer.current)window.clearTimeout(sparkTimer.current);setSparkSettingsOpen(false);setSparkEditing(true);}
        const position=clampFloatingPosition({x:event.clientX-sparkPointerOffset.current.x,y:event.clientY-sparkPointerOffset.current.y},{width:window.innerWidth,height:window.innerHeight,buttonSize:58,sideInset:8,topInset:55,bottomInset:126});
        sparkPositionRef.current=position;
        setSparkDraft({ ...position, opacity:data.userPreferences.floatingButton.opacity });
      }}
      onPointerUp={() => { if (sparkTimer.current) window.clearTimeout(sparkTimer.current); const position=sparkPositionRef.current;if(sparkDragging.current&&typeof position.x==="number"&&typeof position.y==="number"){const saved={x:position.x,y:position.y,opacity:data.userPreferences.floatingButton.opacity};setSparkDraft(saved);setData((current)=>({...current,preferences:{...current.preferences,sparkFab:saved},userPreferences:{...current.userPreferences,floatingButton:saved}}));}sparkPointerStart.current=null;sparkDragging.current=false;setSparkEditing(false); }}
      onPointerCancel={() => { if (sparkTimer.current) window.clearTimeout(sparkTimer.current); sparkPointerStart.current=null;sparkDragging.current=false;setSparkEditing(false); }}
      onClick={() => { if(sparkSuppressClick.current){sparkSuppressClick.current=false;sparkLongPressed.current=false;return;}setSparkFullscreen(true); }}><Feather size={25}/></button>}
    {!sparkFullscreen&&sparkSettingsOpen && <section className="spark-editor card" aria-label="灵光按钮设置"><header><div><small>位置已保存</small><h3>灵光按钮</h3></div><button aria-label="关闭设置" className="icon-button" onClick={() => setSparkSettingsOpen(false)}><X/></button></header><p>透明度</p><div className="opacity-options">{[20,40,60,80,100].map((value)=><button key={value} className={Math.round(sparkDraft.opacity*100)===value?"active":""} onClick={()=>setSparkDraft((draft)=>({...draft,opacity:value/100}))}>{value}%</button>)}</div><button className="primary full" onClick={()=>{setData((current)=>({...current,preferences:{...current.preferences,sparkFab:sparkDraft},userPreferences:{...current.userPreferences,floatingButton:sparkDraft}}));setSparkSettingsOpen(false);notify("灵光按钮设置已保存")}}>保存设置</button></section>}
    {!sparkFullscreen&&<nav className="bottom-nav" aria-label="主导航">{mainTabs.map(({ id, label, icon: Icon }) => <button key={id} aria-label={label} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon/><span>{label}</span></button>)}</nav>}
    {sparkFullscreen&&<SparkFullscreen data={data} setData={setData} onClose={()=>setSparkFullscreen(false)} onAdd={()=>setForm("spark")} notify={notify}/>}
    {form && <EntrySheet kind={form} data={data} close={() => setForm(null)} submit={addFromForm}/>} 
    {vaultAccessOpen&&<div className="sheet-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&setVaultAccessOpen(false)}><form className="sheet vault-access" onSubmit={submitVaultAccess}><header><div><small>AES-GCM 本机加密</small><h2>{data.vaultMeta?"解锁密码箱":"设置主密码"}</h2></div><button type="button" aria-label="关闭" onClick={()=>setVaultAccessOpen(false)}><X/></button></header><div className="form-fields"><label><span>请输入密码</span><input type="password" minLength={8} required value={vaultPassword} onChange={event=>setVaultPassword(event.target.value)}/></label>{!data.vaultMeta&&<label><span>确认密码</span><input type="password" minLength={8} required value={vaultConfirm} onChange={event=>setVaultConfirm(event.target.value)}/></label>}</div><button className="primary submit" type="submit">{data.vaultMeta?"解锁":"保存并进入"}</button></form></div>}
    {toast && <div role="status" className="toast">{toast}</div>}
  </main>;
}

function Header({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <header className="page-header"><div><span>{eyebrow}</span><h1>{title}</h1></div>{action}</header>;
}
function Empty({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) { return <div className="empty card">{icon}<h3>{title}</h3><p>{text}</p>{action}</div>; }
function SideNav<T extends string>({ items, value, onChange, icons }: { items: readonly T[]; value: T; onChange: (v: T) => void; icons: Record<T, string> }) { return <aside className="side-nav">{items.map((item) => <button key={item} className={item === value ? "active" : ""} onClick={() => onChange(item)}><span>{icons[item]}</span>{item}</button>)}</aside>; }
function SectionLayout({ side, children }: { side: React.ReactNode; children: React.ReactNode }) { return <div className="section-layout">{side}<section className="section-main">{children}</section></div>; }
function DeleteButton({ onClick }: { onClick: () => void }) { return <button className="icon-button danger" aria-label="删除" onClick={onClick}><Trash2 size={18}/></button>; }

const weatherLabel=(code:number)=>code===0?"晴":code<=3?"多云":code<=48?"有雾":code<=67?"有雨":code<=77?"有雪":code<=82?"阵雨":code<=86?"阵雪":"雷雨";
function WeatherBadge(){const [weather,setWeather]=useState<{label:string;temperature:number;uv:string}|null>(null);const [status,setStatus]=useState(()=>navigator.geolocation?"正在获取当前位置天气":"此设备不支持定位");useEffect(()=>{if(!navigator.geolocation)return;navigator.geolocation.getCurrentPosition(async(position)=>{try{const {latitude,longitude}=position.coords;const response=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&hourly=uv_index&forecast_days=1&timezone=auto`);if(!response.ok)throw new Error();const value=await response.json();const hour=String(value.current.time).slice(0,13);const uvIndex=Math.max(0,value.hourly.time.findIndex((item:string)=>item.slice(0,13)===hour));setWeather({label:weatherLabel(Number(value.current.weather_code)),temperature:Math.round(Number(value.current.temperature_2m)),uv:Number(value.hourly.uv_index[uvIndex]??0).toFixed(1)});}catch{setStatus("天气暂不可用")}},()=>setStatus("允许定位后显示天气"),{enableHighAccuracy:false,timeout:8000,maximumAge:900000});},[]);return <div className="weather">{weather?<><b>{weather.label} {weather.temperature}°</b><span>紫外线指数 {weather.uv}</span></>:<><b>☁️ 天气</b><span>{status}</span></>}</div>}

function Today({ data, setData, add, remove }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; add: (v: FormKind) => void; remove: (k: keyof AppData, id: string) => void }) {
  const greeting = new Date().getHours() < 12 ? "早上好" : new Date().getHours() < 18 ? "下午好" : "晚上好";
  return <div className="screen"><div className="hero-card"><div><small>Titia 时序</small><h1>{greeting}</h1><p>让每一天，都留下温柔的痕迹</p></div><WeatherBadge/></div>
    <section className="content-scroll"><div className="section-title"><h2>今日待办</h2><button onClick={() => add("todo")}><Plus/>添加</button></div>
      {data.todos.length ? data.todos.map((item) => <article className="card row-card" key={item.id}><button className={`check ${item.done ? "done" : ""}`} aria-label="切换完成" onClick={() => setData((d) => ({ ...d, todos: d.todos.map((x) => x.id === item.id ? { ...x, done: !x.done } : x) }))}>{item.done && <Check/>}</button><span className={item.done ? "strike" : ""}>{item.text}</span><DeleteButton onClick={() => remove("todos", item.id)}/></article>) : <Empty icon={<ListChecks/>} title="今天轻轻松松" text="写下一件想完成的小事" action={<button className="primary" onClick={() => add("todo")}>添加待办</button>}/>} 
      <div className="section-title"><h2>购物清单</h2><button onClick={() => add("shopping")}>管理<ChevronRight/></button></div>
      <div className="card compact-list">{data.shopping.slice(0,4).map((x) => <div key={x.id}><ShoppingCart size={18}/><span>{x.text}</span><small>{x.bought ? "已买" : "想买"}</small></div>)}{!data.shopping.length && <p className="muted">还没有想买的东西</p>}</div>
    </section></div>;
}

function HomeSpace({ data, section, setSection, setData, add, remove, vaultKey, setupOrUnlock, revealVault, visible }: any) {
  return <SectionLayout side={<SideNav items={homeSections} value={section} onChange={setSection} icons={homeIcons}/>}> <Header eyebrow="生活的小小秩序" title={section} action={section !== "密码箱" && <button className="primary small" onClick={() => add(({ 倒数日:"countdown",购物:"shopping",周期:"period",憨憨:data.pets.length?"petRecord":"pet" } as any)[section])}><Plus/>新增</button>}/><div className="content-scroll">
    {section === "倒数日" && <>{data.countdowns.length ? data.countdowns.map((x:any) => {const status=countdownStatus(x.date);return <article className="card countdown" key={x.id}><div className="emoji-tile">{x.category === "生日" ? "🌈" : "✨"}</div><div className="countdown-info"><h3>{x.title||"未命名事件"}</h3><small>{x.category} · {x.calendar === "lunar" ? "农历" : "公历"}{x.repeat ? " · 每年" : ""}</small><p>{status.valid?x.date:"待设置日期"}</p></div><strong>{status.days??"—"}<small>{status.valid?`天 · ${status.label}`:"待完善"}</small></strong><DeleteButton onClick={() => remove("countdowns",x.id)}/></article>}) : <Empty icon={<Clock3/>} title="期待正在发生" text="记录生日、纪念日和重要时刻"/>}</>}
    {section === "购物" && <>{[false,true].map((bought) => <section key={String(bought)}><h2>{bought?"已买":"想买"}</h2>{data.shopping.filter((x:any)=>x.bought===bought).map((x:any)=><article className="card row-card" key={x.id}><button className={`check ${x.bought?"done":""}`} onClick={()=>setData((d:any)=>({...d,shopping:d.shopping.map((i:any)=>i.id===x.id?{...i,bought:!i.bought}:i)}))}>{x.bought&&<Check/>}</button><span className={x.bought?"strike":""}>{x.text}</span><DeleteButton onClick={()=>remove("shopping",x.id)}/></article>)}</section>)}</>}
    {section === "周期" && <PeriodView data={data} remove={remove}/>} 
    {section === "憨憨" && <PetView data={data} add={add} remove={remove}/>} 
    {section === "密码箱" && <VaultView data={data} keyValue={vaultKey} setup={setupOrUnlock} add={add} remove={remove} reveal={revealVault} visible={visible}/>} 
  </div></SectionLayout>;
}
function PeriodView({data,remove}:any){const latest=data.periods[0];const [month,setMonth]=useState(()=>new Date());const cells=buildPeriodCalendar(month.getFullYear(),month.getMonth(),data.periods);const first=new Date(month.getFullYear(),month.getMonth(),1).getDay();return <>{latest&&<div className="metric-card"><div><small>本次周期</small><strong>第 {Math.max(1,Math.floor((new Date(`${sessionDay}T12:00:00`).getTime()-new Date(`${latest.start}T12:00:00`).getTime())/86400000)+1)} 天</strong></div><div><small>开始日期</small><strong>{latest.start}</strong></div></div>}<section className="card period-calendar"><header><button aria-label="上个月" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button><h3>{month.getFullYear()}年{month.getMonth()+1}月</h3><button aria-label="下个月" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button></header><div className="period-week">{"日一二三四五六".split("").map(x=><small key={x}>{x}</small>)}</div><div className="period-days">{Array.from({length:first},(_,i)=><i key={`blank-${i}`}/>) }{cells.map(day=><span key={day.date} className={`${day.period?"period":""} ${day.predicted?"predicted":""} ${day.today?"today":""}`}>{day.day}</span>)}</div><footer><small><i className="legend-period"/>经期</small><small><i className="legend-predicted"/>预计</small><small><i className="legend-today"/>今天</small></footer></section><h2>历史记录</h2>{data.periods.map((x:any)=><article className="card row-card" key={x.id}><CalendarDays/><div><b>{x.start}</b><p>{x.end?`至 ${x.end}`:"进行中"} {x.note}</p></div><DeleteButton onClick={()=>remove("periods",x.id)}/></article>)}{!data.periods.length&&<Empty icon={<CalendarDays/>} title="尚无周期记录" text="记录开始日期后自动计算周期"/>}</>}
function PetView({data,add,remove}:any){const pet=data.pets[0];if(!pet)return <Empty icon={<Cat/>} title="欢迎一位小伙伴" text="建立宠物档案，记录成长与健康" action={<button className="primary" onClick={()=>add("pet")}>创建档案</button>}/>;return <><div className="card pet-profile"><div className="pet-avatar">🐾</div><div><small>我的憨憨</small><h2>{pet.name}</h2><p>{pet.breed} · {pet.sex} · {pet.birthday}</p></div></div><div className="pet-actions">{[["moment","成长时光","📸"],["weight","体重","⚖️"],["health","健康记录","💊"]].map(([id,label,icon])=><button key={id} onClick={()=>add("petRecord")}><span>{icon}</span>{label}</button>)}</div>{data.petRecords.map((x:any)=><article className="card record-card" key={x.id}><small>{x.kind} · {x.date}</small><h3>{x.value||x.note}</h3><p>{x.note}</p><DeleteButton onClick={()=>remove("petRecords",x.id)}/></article>)}</>}
function VaultView({data,keyValue,setup,add,remove,reveal,visible}:any){if(!keyValue)return <Empty icon={<LockKeyhole/>} title={data.vaultMeta?"密码箱已锁定":"创建你的密码箱"} text="凭据经 AES-GCM 加密，只保存在此设备" action={<button className="primary" onClick={setup}>{data.vaultMeta?"输入主密码解锁":"设置主密码"}</button>}/>;return <><div className="security-note"><ShieldCheck/>已在本机安全解锁</div><button className="primary" onClick={()=>add("vault")}><Plus/>添加凭据</button>{data.vault.map((x:any)=><article className="card vault-card" key={x.id}><div><small>账号密码</small><h3>{x.title}</h3>{visible[x.id]?<><p>{visible[x.id].username}</p><code>{visible[x.id].password}</code></>:<button className="text-button" onClick={()=>reveal(x)}>查看账号和密码</button>}</div><DeleteButton onClick={()=>remove("vault",x.id)}/></article>)}</>}

function Ledger({ data, setData, section, setSection, add, notify }: any) {
  const [categoryType, setCategoryType] = useState<"expense" | "income">("expense");
  const balance=TitiaStore.balance(data.transactions,data.accounts.reduce((s:number,a:any)=>s+a.opening,0));const income=data.transactions.filter((x:any)=>x.type==="income").reduce((s:number,x:any)=>s+x.amount,0);const expense=data.transactions.filter((x:any)=>x.type==="expense").reduce((s:number,x:any)=>s+x.amount,0);
  const action = section === "资产" ? <button className="primary small" onClick={()=>add("account")}><Plus/>加账户</button> : ["首页","账单"].includes(section) ? <button className="primary small" onClick={()=>add("transaction")}><Plus/>记一笔</button> : undefined;
  return <SectionLayout side={<SideNav items={ledgerSections} value={section} onChange={setSection} icons={ledgerIcons}/>}> <Header eyebrow="清楚地看见每一笔" title="小账" action={action}/>
    {section!=="首页"&&<LedgerOverview section={section} data={data}/>}<div className="content-scroll ledger-scroll">
    {section==="首页"&&<><div className="balance-card"><small>净资产</small><strong>{money(balance)}</strong><p>{data.accounts.length} 个资产账户</p></div><div className="triple card"><div><b>{money(income)}</b><span>收入</span></div><div><b>{money(expense)}</b><span>支出</span></div><div><b>{money(income-expense)}</b><span>结余</span></div></div><BudgetList data={data} onEdit={()=>add("budget")}/></>}
    {section==="账单"&&<GroupedTransactions transactions={data.transactions} accounts={data.accounts} categories={data.ledgerCategories} onDelete={async(transaction:Transaction)=>{await store.save(data);const updated=await store.deleteTransactionWithAttachment(transaction.id);setData(updated);notify("账单已删除，账户余额已回滚")}} onBatchDelete={async(ids:string[])=>{await Promise.all(ids.map(id=>store.deleteAttachmentByTransaction(id)));setData((current:AppData)=>({...current,transactions:current.transactions.filter(item=>!ids.includes(item.id))}));notify(`已删除 ${ids.length} 笔，账户余额已回滚`)}} onBatchCategory={(ids:string[],category:string)=>{setData((current:AppData)=>({...current,transactions:current.transactions.map(item=>ids.includes(item.id)?{...item,category,updatedAt:new Date().toISOString()}:item)}));notify("分类已批量更新")}} onBatchAccount={(ids:string[],accountId:string)=>{setData((current:AppData)=>({...current,transactions:current.transactions.map(item=>ids.includes(item.id)?{...item,accountId,updatedAt:new Date().toISOString()}:item)}));notify("账户已批量更新")}} onOpenAttachment={async(transaction:Transaction)=>{const attachment=await store.getAttachmentByTransaction(transaction.id);if(!attachment){notify("没有找到原图附件");return;}const url=URL.createObjectURL(attachment.image);window.open(url,"_blank","noopener,noreferrer");setTimeout(()=>URL.revokeObjectURL(url),60_000)}}/>}
    {section==="资产"&&<AccountGroups data={data} add={add}/>}
    {section==="分析"&&<Analysis data={data}/>}
    {section==="分类"&&<CategoryView data={data} setData={setData} type={categoryType} setType={setCategoryType} add={add} notify={notify}/>}
    {section==="导入导出"&&<DataCenter data={data} setData={setData} notify={notify}/>}
    {section==="AI识别"&&<AiRecognition data={data} setData={setData} notify={notify}/>}
  </div></SectionLayout>;
}

function LedgerOverview({section,data}:{section:string;data:AppData}){
  const month=today().slice(0,7);let title="";let metrics:Array<[string,string|number]>=[];
  if(section==="账单"){const value=ledgerSummary(data,month);title="本月账单";metrics=[["支出",money(value.expense)],["收入",money(value.income)],["结余",money(value.balance)],["账单数量",`${value.count} 笔`]];}
  if(section==="资产"){const value=assetSummary(data);title="资产总览";metrics=[["总资产",money(value.assets)],["总负债",money(value.liabilities)],["净资产",money(value.net)],["账户数量",`${value.accountCount} 个`]];}
  if(section==="分析"){const value=analysisSummary(data,month);title="分析概览";metrics=[["本月消费",money(value.spending)],["最大支出分类",value.topCategory],["消费次数",`${value.count} 次`],["环比变化",`${value.monthOverMonth>=0?"+":""}${value.monthOverMonth}%`]];}
  if(section==="分类"){const value=categorySummary(data,month);title="分类统计";metrics=[["支出分类",value.expenseCount],["收入分类",value.incomeCount],["最大消费分类",value.topCategory]];}
  if(section==="导入导出"){const value=dataSummary(data);title="数据管理概览";metrics=[["数据总量",`${value.total} 条`],["最近备份",value.lastBackupAt?new Date(value.lastBackupAt).toLocaleDateString("zh-CN"):"尚未备份"],["存储空间",`${Math.max(1,Math.round(value.storageBytes/1024))} KB`]];}
  if(section==="AI识别"){title="识别流程";metrics=[["第一步","上传截图"],["第二步","本地识别"],["第三步","确认草稿"]];}
  return <section className="card ledger-overview"><h2>{title}</h2><div>{metrics.map(([label,value])=><span key={label}><small>{label}</small><b>{value}</b></span>)}</div></section>;
}

function AccountGroups({data,add}:any){const groups=groupAccounts(data.accounts);const render=(title:string,accounts:any[])=><section className="account-group"><h2>{title}</h2>{accounts.map((x:any)=><article className="card account" key={x.id}><WalletCards/><div><h3>{x.name}</h3><p>{x.kind}</p></div><strong>{money(x.opening+TitiaStore.balance(data.transactions.filter((t:any)=>t.accountId===x.id)))}</strong></article>)}{!accounts.length&&<p className="muted">暂无{title}账户</p>}</section>;return <>{render("资产",groups.assets)}{render("负债",groups.liabilities)}<button className="secondary full" onClick={()=>add("account")}><Plus/>添加账户</button></>}
function CategoryView({data,setData,type,setType,add,notify}:any){const [editing,setEditing]=useState(false);const parents=data.ledgerCategories.filter((item:any)=>item.type===type&&!item.parentId);const save=(categories:any[])=>setData((current:AppData)=>({...current,ledgerCategories:categories,categories:leafCategoryNames(categories)}));const addParent=()=>{const name=prompt("新的一级分类名称");if(name?.trim())save(addLedgerCategory(data.ledgerCategories,{id:uid(),name:name.trim(),type}))};const addChild=(parentId:string)=>{const name=prompt("新的二级分类名称");if(name?.trim())save(addLedgerCategory(data.ledgerCategories,{id:uid(),name:name.trim(),type,parentId}))};const rename=(id:string,name:string)=>{const next=prompt("修改分类名称",name);if(next?.trim())save(renameLedgerCategory(data.ledgerCategories,id,next))};const removeCategory=(id:string)=>{const used=data.transactions.some((transaction:any)=>transaction.category===data.ledgerCategories.find((item:any)=>item.id===id)?.name);if(used&&!confirm("已有账单使用此分类，删除只影响分类库，账单文字会保留。继续吗？"))return;save(deleteLedgerCategory(data.ledgerCategories,id));notify("分类已删除")};return <><div className="category-tabs"><button className={type==="expense"?"active":""} onClick={()=>setType("expense")}>支出分类</button><button className={type==="income"?"active":""} onClick={()=>setType("income")}>收入分类</button></div><div className="category-toolbar"><button className="secondary" onClick={()=>setEditing(!editing)}>{editing?"完成":"编辑分类"}</button>{editing&&<button className="primary" onClick={addParent}><Plus/>新增一级</button>}</div><div className="category-tree">{parents.map((parent:any)=><section className="card" key={parent.id}><header><span>{type==="income"?"💵":"🫧"}</span><h3>{parent.name}</h3>{editing&&<><button onClick={()=>rename(parent.id,parent.name)}>改名</button><button className="danger" onClick={()=>removeCategory(parent.id)}>删除</button></>}</header><div>{data.ledgerCategories.filter((child:any)=>child.parentId===parent.id).map((child:any)=><span className="category-chip" key={child.id}>{child.name}{editing&&<><button onClick={()=>rename(child.id,child.name)}>✎</button><button onClick={()=>removeCategory(child.id)}>×</button></>}</span>)}{editing&&<button className="category-chip add-chip" onClick={()=>addChild(parent.id)}>＋ 二级分类</button>}</div></section>)}</div>{type==="expense"&&<button className="secondary full" onClick={()=>add("budget")}>设置分类预算</button>}</>}

function downloadFile(content:BlobPart,type:string,name:string){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement("a");link.href=url;link.download=name;link.click();URL.revokeObjectURL(url);}

function DataCenter({data,setData,notify}:any){
  const inputRef=useRef<HTMLInputElement>(null);const [preview,setPreview]=useState<any>(null);const [busy,setBusy]=useState(false);
  const exportExcel=async()=>{setBusy(true);try{downloadFile(await buildLedgerWorkbook(data),"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",`titia-ledger-${today()}.xlsx`);setData((current:AppData)=>({...current,backupMeta:{lastSpreadsheetExportAt:new Date().toISOString()}}));notify("Excel 已导出");}finally{setBusy(false)}};
  const importExcel=async(file?:File)=>{if(!file)return;setBusy(true);try{setPreview(await parseLedgerWorkbook(await file.arrayBuffer(),data));notify("表格识别完成，请确认");}catch{notify("无法读取此 Excel 文件");}finally{setBusy(false)}};
  const confirmImport=()=>{if(!preview)return;const now=new Date().toISOString();setData((current:AppData)=>({...current,transactions:[...preview.transactions.map((item:any)=>({...item,reviewStatus:"confirmed",source:"import",updatedAt:now})),...current.transactions]}));notify(`已导入 ${preview.summary.total} 条账单`);setPreview(null)};
  return <><section className="card data-center"><h2>表格数据中心</h2><p>字段完整保存在本机，导入前先预览，不会直接覆盖现有账单。</p><div className="button-row"><button className="primary" disabled={busy} onClick={exportExcel}><Download/>导出 Excel</button><button className="secondary" onClick={()=>downloadFile(buildTransactionCsv(data),"text/csv;charset=utf-8",`titia-bills-${today()}.csv`)}><Download/>导出 CSV</button></div><button className="secondary full" disabled={busy} onClick={()=>inputRef.current?.click()}><Upload/>导入 Excel</button><input ref={inputRef} hidden type="file" accept=".xlsx,.xls" onChange={(event)=>importExcel(event.target.files?.[0])}/><small>包含：账单、分类、账户、预算、资产</small></section>{preview&&<section className="card import-preview"><h2>识别成功</h2><div className="preview-stats"><span><b>{preview.summary.total}</b>条账单</span><span><b>{preview.summary.income}</b>条收入</span><span><b>{preview.summary.expense}</b>条支出</span></div>{preview.summary.errors>0&&<p className="danger">另有 {preview.summary.errors} 行无法识别，已跳过。</p>}<div className="preview-rows">{preview.transactions.slice(0,5).map((item:any)=><p key={item.id}>{item.date} · {item.category} · {money(item.amount)}</p>)}</div><div className="button-row"><button className="secondary" onClick={()=>setPreview(null)}>取消</button><button className="primary" onClick={confirmImport}>确认导入</button></div></section>}</>;
}

function AiRecognition({data,setData,notify}:any){
  const fileRef=useRef<HTMLInputElement>(null);const [image,setImage]=useState("");const [imageBlob,setImageBlob]=useState<Blob|null>(null);const [attachmentId,setAttachmentId]=useState("");const [ocrText,setOcrText]=useState("");const [batch,setBatch]=useState<ReviewBatch|null>(null);const [busy,setBusy]=useState(false);
  const parseText=()=>{const result=parseBillBatch({text:ocrText,attachmentId:attachmentId||undefined,data});setBatch(result);notify(result.drafts.some((draft)=>draft.valid)?`已生成 ${result.drafts.length} 笔审核草稿`:"没有可靠金额，请在审核页补充")};
  const chooseImage=async(file?:File)=>{if(!file)return;if(image)URL.revokeObjectURL(image);setImage(URL.createObjectURL(file));setImageBlob(file);const nextAttachmentId=uid();setAttachmentId(nextAttachmentId);setBusy(true);notify("正在设备本地识别，首次使用需加载 OCR 模型");try{const text=await recognizeImageLocally(file);setOcrText(text);setBatch(parseBillBatch({text,attachmentId:nextAttachmentId,data}));notify("本地识别完成，请审核后保存");}catch{notify("本地 OCR 识别失败，可粘贴文字继续");}finally{setBusy(false)}};
  const changeDraft=(changed:ReviewDraft)=>setBatch((current)=>current?{...current,drafts:current.drafts.map((draft)=>draft.id===changed.id?changed:draft)}:current);
  const deleteDraft=(id:string)=>setBatch((current)=>current?{...current,drafts:current.drafts.filter((draft)=>draft.id!==id)}:current);
  const confirm=async(ids:string[])=>{if(!batch)return;const chosen=batch.drafts.filter((draft)=>ids.includes(draft.id));const transactions=chosen.map(reviewDraftToTransaction).map((transaction)=>imageBlob?{...transaction,imageId:uid()}:transaction);setData((current:AppData)=>({...current,transactions:[...transactions,...current.transactions]}));if(imageBlob)await Promise.all(transactions.map((transaction)=>store.putAttachment({id:transaction.imageId!,transactionId:transaction.id,image:imageBlob,createdAt:new Date().toISOString()})));notify(`已保存 ${transactions.length} 条识别账单`);setBatch(null)};
  return <><section className="card ai-center"><h2>本地智能识别</h2><p>截图/文字 → 来源与金额分析 → 订单拆分 → 重复检测 → 人工审核</p><button className="primary full" disabled={busy} onClick={()=>fileRef.current?.click()}><Upload/>上传账单截图</button><input ref={fileRef} hidden type="file" accept="image/*" onChange={(event)=>chooseImage(event.target.files?.[0])}/>{image&&<img src={image} alt="待识别账单截图"/>}<label><span>OCR 文字</span><textarea value={ocrText} onChange={(event)=>setOcrText(event.target.value)} rows={7} placeholder="Safari 可在照片中复制文字后粘贴；内容只在本机解析"/></label><button className="secondary full" disabled={!ocrText.trim()} onClick={parseText}>分析并进入智能审核</button><small>不会上传账单图片；不确定金额和疑似重复默认不入账。</small></section>{batch&&<LedgerReview key={batch.id} batch={batch} accounts={data.accounts} categories={data.ledgerCategories} imageUrl={image} onChange={changeDraft} onDelete={deleteDraft} onSave={confirm} onReparse={parseText}/>}</>;
}
function BudgetList({data,onEdit}:any){const month=today().slice(0,7);return <button type="button" className="card budget-card" aria-label="设置本月预算" onClick={onEdit}><h3>本月预算 <span>设置 ›</span></h3>{data.budgets.filter((b:any)=>b.month===month).map((b:any)=>{const spent=data.transactions.filter((t:any)=>t.type==="expense"&&t.category===b.category&&t.date.startsWith(month)).reduce((s:number,t:any)=>s+t.amount,0);return <div className="budget" key={b.id}><div><b>{b.category}</b><span>{money(spent)} / {money(b.amount)}</span></div><progress max={b.amount} value={spent}/></div>})}{!data.budgets.some((b:any)=>b.month===month)&&<p className="muted">还没有设置本月预算，点击这里开始</p>}</button>}
function Analysis({data}:any){const categories=[...new Set(data.transactions.filter((t:any)=>t.type==="expense").map((t:any)=>t.category))] as string[];const totals=categories.map((c:string)=>({c,total:data.transactions.filter((t:any)=>t.type==="expense"&&t.category===c).reduce((s:number,t:any)=>s+t.amount,0)})).filter((x:any)=>x.total>0);const max=Math.max(1,...totals.map((x:any)=>x.total));return <div className="card analysis"><h2>支出分布</h2>{totals.map((x:any)=><div key={x.c}><span>{x.c}</span><div><i style={{width:`${x.total/max*100}%`}}/></div><b>{money(x.total)}</b></div>)}{!totals.length&&<p className="muted">有账单后，这里会形成清晰的趋势</p>}</div>}

function TimeSpace({data,section,setSection,add,remove}:any){const [relationshipType,setRelationshipType]=useState<"moment"|"review">("moment");return <SectionLayout side={<SideNav items={timeSections} value={section} onChange={setSection} icons={timeIcons}/>}> <Header eyebrow="把值得的事留下" title={section} action={<button className="round-add" aria-label="新增" onClick={()=>add(section==="日记"?"diary":"relationship")}><Plus/></button>}/><div className="content-scroll">{section==="日记"?<>{data.diaries.map((x:any)=><article className="card diary" key={x.id}><div className="mood">{x.mood}</div><h2>{x.title}</h2><p>{x.body}</p><footer><time>{x.date}</time><DeleteButton onClick={()=>remove("diaries",x.id)}/></footer></article>)}{!data.diaries.length&&<Empty icon={<NotebookTabs/>} title="写给今天" text="留住情绪、照片和一段小故事"/>}</>:<><div className="relationship-tabs"><button className={relationshipType==="moment"?"active":""} onClick={()=>setRelationshipType("moment")}>💞 感动瞬间</button><button className={relationshipType==="review"?"active":""} onClick={()=>setRelationshipType("review")}>🔎 矛盾复盘</button></div>{data.relationships.filter((x:any)=>x.type===relationshipType).map((x:any)=><article className="card relation" key={x.id}><small>{x.type==="moment"?"💞 感动瞬间":"🔎 矛盾复盘"} · @{x.person}</small><h2>{x.title}</h2><p>{x.body}</p>{x.reflection&&<blockquote>{x.reflection}</blockquote>}<footer><time>{x.date}</time><DeleteButton onClick={()=>remove("relationships",x.id)}/></footer></article>)}{!data.relationships.some((x:any)=>x.type===relationshipType)&&<Empty icon={<Heart/>} title={relationshipType==="moment"?"记录一次被打动":"温柔复盘一次矛盾"} text="两个板块分别保存和查看，不再混在一起"/>}</>}</div></SectionLayout>}

function Me({data,setData,exportBackup,notify}:any){return <div className="screen"><div className="profile-hero"><div><small>Titia 时序</small><h1>{data.profile.name||"我的生活手账"}</h1><p>从 {data.profile.createdAt} 开始，认真收藏日常</p></div><div className="mascot">☁️</div></div><div className="content-scroll"><Header eyebrow="设置" title="我的空间"/><section className="card settings-card"><button onClick={()=>{const name=prompt("怎么称呼你？",data.profile.name);if(name!==null)setData((d:any)=>({...d,profile:{...d.profile,name}}))}}><UserRound/><span><b>个人资料</b><small>名字与纪念日期</small></span><ChevronRight/></button></section><DataManagement data={data} setData={setData} notify={notify} onExport={exportBackup}/><section className="card settings-card"><button><Settings/><span><b>应用设置</b><small>iOS 17+ · 离线优先</small></span><ChevronRight/></button><button><Sparkles/><span><b>关于 Titia</b><small>让时间留下痕迹</small></span><ChevronRight/></button></section></div></div>}

function EntrySheet({kind,data,close,submit}:{kind:Exclude<FormKind,null>;data:AppData;close:()=>void;submit:(e:React.FormEvent<HTMLFormElement>)=>void}){const title:Record<string,string>={todo:"新增待办",shopping:"加入购物清单",countdown:"新增倒数日",period:"记录周期",pet:"创建宠物档案",petRecord:"添加宠物记录",diary:"写日记",relationship:"记录关系",transaction:"记一笔",account:"添加账户",budget:"设置预算",vault:"保存账号密码",spark:"灵光一闪"};return <div className="sheet-backdrop" onMouseDown={(e)=>e.target===e.currentTarget&&close()}><form className="sheet" onSubmit={submit}><header><div><small>保存到本机</small><h2>{title[kind]}</h2></div><button type="button" aria-label="关闭" onClick={close}><X/></button></header><div className="form-fields">{kind==="spark"&&<label><span>标题</span><input name="title" required/></label>}<Fields kind={kind} data={data}/>{kind==="spark"&&<label><span>图片附件（可选）</span><input name="sparkImage" type="file" accept="image/*"/></label>}</div><button className="primary submit" type="submit">保存</button></form></div>}
function Fields({kind,data}:{kind:string;data:AppData}){const input=(name:string,label:string,type="text",required=true)=><label><span>{label}</span><input name={name} type={type} step={type==="number"?"0.01":undefined} required={required} defaultValue={type==="date"?today():undefined}/></label>;if(kind==="todo"||kind==="shopping")return input("text",kind==="todo"?"要做什么":"想买什么");if(kind==="countdown")return <>{input("title","事件名称")}{input("date","日期","date")}<label><span>分类</span><select name="category"><option>生日</option><option>纪念日</option><option>其他</option></select></label><label><span>历法</span><select name="calendar"><option value="solar">公历</option><option value="lunar">农历</option></select></label><label className="toggle"><input name="repeat" type="checkbox"/>每年重复</label></>;if(kind==="period")return <>{input("start","开始日期","date")}{input("end","结束日期","date",false)}{input("note","备注","text",false)}</>;if(kind==="pet")return <>{input("name","名字")}{input("breed","品种")}{input("birthday","生日","date")}<label><span>性别</span><select name="sex"><option>男孩</option><option>女孩</option><option>未知</option></select></label></>;if(kind==="petRecord")return <><label><span>宠物</span><select name="petId">{data.pets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label><span>类型</span><select name="kind"><option value="moment">成长时光</option><option value="weight">体重</option><option value="health">健康记录</option></select></label>{input("date","日期","date")}{input("value","数值或标题")}{input("note","详细记录","text",false)}</>;if(kind==="diary")return <>{input("title","标题")}{input("date","日期","date")}<label><span>心情</span><select name="mood"><option>😊 晴朗</option><option>😌 平静</option><option>🥹 感动</option><option>😔 低落</option><option>😤 烦躁</option></select></label><label><span>正文</span><textarea name="body" required rows={5}/></label></>;if(kind==="relationship")return <><label><span>类型</span><select name="type"><option value="moment">感动瞬间</option><option value="review">矛盾复盘</option></select></label>{input("person","关于谁")}{input("title","标题")}{input("date","日期","date")}<label><span>发生了什么</span><textarea name="body" required rows={4}/></label><label><span>我的感受与反思</span><textarea name="reflection" rows={3}/></label></>;if(kind==="transaction")return <><label><span>类型</span><select name="type"><option value="expense">支出</option><option value="income">收入</option></select></label>{input("amount","金额","number")}<label><span>分类</span><select name="category">{data.categories.map(c=><option key={c}>{c}</option>)}</select></label><label><span>账户</span><select name="accountId">{data.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>{input("date","日期","date")}{input("note","备注","text",false)}</>;if(kind==="account")return <>{input("name","账户名称")}{input("opening","期初余额","number")}<label><span>类型</span><select name="kind"><option>现金</option><option>银行卡</option><option>电子账户</option><option>负债</option></select></label></>;if(kind==="budget")return <><label><span>分类</span><select name="category">{data.categories.map(c=><option key={c}>{c}</option>)}</select></label>{input("amount","预算金额","number")}<label><span>月份</span><input name="month" type="month" required defaultValue={today().slice(0,7)}/></label></>;if(kind==="vault")return <>{input("title","网站或应用")}{input("username","账号")}{input("password","密码","password")}</>;return <><label><span>标签</span><select name="tag"><option>备忘录</option><option>灵感</option><option>产品</option><option>生活</option></select></label><label><span>一闪而过的念头</span><textarea name="body" required rows={5}/></label></>}
