import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Plus, Sparkles, Trash2 } from "lucide-react";
import { filterSparkNotes, sparkTags } from "../lib/sparkNotes";
import { store, type AppData, type SparkNote } from "../lib/store";
import { CardSelect } from "./CardSelect";

type Props = { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; onClose: () => void; onAdd: () => void; notify: (message: string) => void };

function SparkMediaGallery({ noteId }: { noteId: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => { let active = true; const created: string[] = []; store.getSparkMedia(noteId).then((items) => { for (const item of items) created.push(URL.createObjectURL(item.image)); if (active) setUrls(created); }); return () => { active = false; created.forEach(URL.revokeObjectURL); }; }, [noteId]);
  return urls.length ? <div className="spark-images">{urls.map((url) => <img key={url} src={url} alt="灵光附件"/>)}</div> : null;
}

export function SparkFullscreen({ data, setData, onClose, onAdd, notify }: Props) {
  const [tag, setTag] = useState("全部");
  const [editing,setEditing]=useState<SparkNote|null>(null);
  const swipeStart=useRef<number|null>(null);
  const notes = filterSparkNotes(data.sparkNotes, tag);
  const remove = async (id: string) => { if (!confirm("确认删除这条灵光吗？")) return; await store.deleteSparkMedia(id); setData((current) => ({ ...current, sparkNotes: current.sparkNotes.filter((note) => note.id !== id), sparks: current.sparks.filter((note) => note.id !== id) })); notify("灵光已删除"); };
  return <section role="dialog" aria-label="灵光一闪" aria-modal="true" className="spark-fullscreen" onTouchStart={event=>{if(event.touches[0].clientX<28)swipeStart.current=event.touches[0].clientX}} onTouchEnd={event=>{if(swipeStart.current!==null&&event.changedTouches[0].clientX-swipeStart.current>90)onClose();swipeStart.current=null}}>
    <header className="spark-fullscreen-header"><button aria-label="返回原页面" onClick={onClose}><ArrowLeft/></button><div><small>记录稍纵即逝的想法</small><h1>灵光一闪</h1></div><button className="primary small" onClick={onAdd}><Plus/>新增</button></header>
    <div className="spark-fullscreen-body"><div className="spark-filter-card card"><CardSelect label="标签筛选" value={tag} onChange={setTag} options={sparkTags.map(value=>({value,label:value}))}/></div>
      {notes.map((note) => <article className="card spark-note" key={note.id}><small>{note.tag}</small><h2>{note.title||"无题灵光"}</h2><p>{note.content}</p><SparkMediaGallery noteId={note.id}/><footer><time>{new Date(note.createdAt).toLocaleString("zh-CN")}</time><button className="text-button" onClick={() => setEditing(note)}>编辑</button><button className="icon-button danger" aria-label="删除灵光" onClick={() => remove(note.id)}><Trash2 size={18}/></button></footer></article>)}
      {!notes.length && <div className="card empty"><Sparkles/><h3>还没有这一类灵光</h3><p>点击新增，快速记下一闪而过的想法</p><button className="primary" onClick={onAdd}>新增灵光</button></div>}
    </div>{editing&&<div className="sheet-backdrop"><form className="sheet" onSubmit={event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));setData(current=>({...current,sparkNotes:current.sparkNotes.map(note=>note.id===editing.id?{...note,title:String(values.title||""),content:String(values.content),tag:String(values.tag),updatedAt:new Date().toISOString()}:note)}));setEditing(null);notify("灵光已更新")}}><header><div><small>与新增页一致</small><h2>编辑灵光</h2></div><button type="button" aria-label="关闭编辑" onClick={()=>setEditing(null)}>×</button></header><div className="form-fields"><label><span>标题（可选）</span><input name="title" defaultValue={editing.title}/></label><CardSelect label="一级分类 / 标签" name="tag" defaultValue={editing.tag} options={sparkTags.filter(item=>item!=="全部").map(value=>({value,label:value}))}/><label><span>一闪而过的念头</span><textarea name="content" required rows={7} defaultValue={editing.content}/></label></div><button className="primary submit" type="submit">保存修改</button></form></div>}
  </section>;
}
