import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Sparkles, Trash2 } from "lucide-react";
import { filterSparkNotes, sparkTags } from "../lib/sparkNotes";
import { store, type AppData } from "../lib/store";

type Props = { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; onClose: () => void; onAdd: () => void; notify: (message: string) => void };

function SparkMediaGallery({ noteId }: { noteId: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => { let active = true; const created: string[] = []; store.getSparkMedia(noteId).then((items) => { for (const item of items) created.push(URL.createObjectURL(item.image)); if (active) setUrls(created); }); return () => { active = false; created.forEach(URL.revokeObjectURL); }; }, [noteId]);
  return urls.length ? <div className="spark-images">{urls.map((url) => <img key={url} src={url} alt="灵光附件"/>)}</div> : null;
}

export function SparkFullscreen({ data, setData, onClose, onAdd, notify }: Props) {
  const [tag, setTag] = useState("全部");
  const notes = filterSparkNotes(data.sparkNotes, tag);
  const edit = (id: string, currentTitle: string, currentContent: string) => { const title = prompt("修改标题", currentTitle); const content = title === null ? null : prompt("修改内容", currentContent); if (title !== null && content !== null) { setData((current) => ({ ...current, sparkNotes: current.sparkNotes.map((note) => note.id === id ? { ...note, title, content, updatedAt: new Date().toISOString() } : note) })); notify("灵光已更新"); } };
  const remove = async (id: string) => { if (!confirm("确认删除这条灵光吗？")) return; await store.deleteSparkMedia(id); setData((current) => ({ ...current, sparkNotes: current.sparkNotes.filter((note) => note.id !== id), sparks: current.sparks.filter((note) => note.id !== id) })); notify("灵光已删除"); };
  return <section role="dialog" aria-label="灵光一闪" aria-modal="true" className="spark-fullscreen">
    <header className="spark-fullscreen-header"><button aria-label="返回原页面" onClick={onClose}><ArrowLeft/></button><div><small>记录稍纵即逝的想法</small><h1>灵光一闪</h1></div><button className="primary small" onClick={onAdd}><Plus/>新增</button></header>
    <div className="spark-fullscreen-body"><div className="spark-tags">{sparkTags.map((item) => <button key={item} className={tag === item ? "active" : ""} onClick={() => setTag(item)}>{item}</button>)}</div>
      {notes.map((note) => <article className="card spark-note" key={note.id}><small>{note.tag}</small><h2>{note.title}</h2><p>{note.content}</p><SparkMediaGallery noteId={note.id}/><footer><time>{new Date(note.createdAt).toLocaleString("zh-CN")}</time><button className="text-button" onClick={() => edit(note.id, note.title, note.content)}>编辑</button><button className="icon-button danger" aria-label="删除灵光" onClick={() => remove(note.id)}><Trash2 size={18}/></button></footer></article>)}
      {!notes.length && <div className="card empty"><Sparkles/><h3>还没有这一类灵光</h3><p>点击新增，快速记下一闪而过的想法</p><button className="primary" onClick={onAdd}>新增灵光</button></div>}
    </div>
  </section>;
}
