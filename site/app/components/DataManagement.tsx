import { useEffect, useRef, useState } from "react";
import { Download, Link2, QrCode, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import type React from "react";
import QRCode from "qrcode";
import { convertLegacyBackup, isLegacyBackup } from "../lib/legacyBackup";
import { buildMigrationUrl, canEncodeMigrationQr, decodeMigrationFragment, encodeMigrationBundle, migrationCounts, type MigrationBundle, type MigrationCounts } from "../lib/migration";
import { normalizeAppData, store, type AppData, type RestoreSnapshot } from "../lib/store";

type Props = { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>> | ((data: AppData) => void); notify: (message: string) => void; onExport: () => void };
type Preview = { bundle: MigrationBundle; counts: MigrationCounts; source: "file" | "link"; warnings: string[] };

const CountGrid = ({ counts }: { counts: MigrationCounts }) => <div className="migration-counts">
  <span>日记 {counts.diaries} 条</span><span>灵光一闪 {counts.sparks} 条</span><span>关系记录 {counts.relationships} 条</span>
  <span>憨憨记录 {counts.petRecords} 条</span><span>待办 {counts.todos} 条</span><span>购物 {counts.shopping} 条</span>
  <span>账单 {counts.transactions} 条</span><span>图片 {counts.images} 张</span>
</div>;

export function DataManagement({ data, setData, notify, onExport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const notifyRef = useRef(notify);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [link, setLink] = useState("");
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<RestoreSnapshot[]>([]);
  const refreshHistory = () => store.listRestoreSnapshots().then(setHistory).catch(() => setHistory([]));

  useEffect(() => {
    refreshHistory();
    const fragment = window.location.hash.slice(1);
    if (!fragment.startsWith("titia-v1.")) return;
    decodeMigrationFragment(fragment).then((bundle) => setPreview({ bundle, counts: migrationCounts(bundle), source: "link", warnings: [] })).catch(() => notifyRef.current("迁移链接已损坏或无法解密"));
  }, []);

  const generate = async () => {
    setBusy(true);
    try {
      const bundle = await store.createBundle(); bundle.data = data;
      const encoded = await encodeMigrationBundle(bundle);
      const url = buildMigrationUrl(encoded, window.location);
      setLink(url); setQr("");
      if (canEncodeMigrationQr(url)) setQr(await QRCode.toDataURL(url, { errorCorrectionLevel: "L", margin: 1, width: 220 }));
      notify("迁移链接已在本机生成");
    } catch { notify("无法生成迁移链接，请检查本机存储空间"); }
    finally { setBusy(false); }
  };

  const readFile = async (file?: File) => {
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text()) as unknown;
      let bundle: MigrationBundle; let warnings: string[] = [];
      if (isLegacyBackup(raw)) { const converted = convertLegacyBackup(raw); bundle = { version: 1, createdAt: new Date().toISOString(), data: converted.data, attachments: [] }; warnings = converted.warnings; }
      else {
        const modern = raw as { app?: string; data?: unknown; version?: number; attachments?: MigrationBundle["attachments"] };
        if (modern.app !== "titia" || !modern.data) throw new Error();
        bundle = { version: 1, createdAt: new Date().toISOString(), data: normalizeAppData(modern.data), attachments: Array.isArray(modern.attachments) ? modern.attachments : [] };
      }
      setPreview({ bundle, counts: migrationCounts(bundle), source: "file", warnings });
    } catch { notify("无法识别此 Titia 备份文件"); }
  };

  const confirmImport = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const result = await store.mergeBundle(preview.bundle, preview.source === "link" ? "迁移链接导入前" : "高级恢复导入前");
      setData(result.bundle.data); setPreview(null); await refreshHistory();
      if (preview.source === "link") window.history.replaceState(null, "", `${location.pathname}${location.search}`);
      notify(`已新增 ${result.added} 条，跳过 ${result.skipped} 条重复数据`);
    } catch { notify("导入失败，当前数据没有变化"); }
    finally { setBusy(false); }
  };

  const restore = async (snapshot: RestoreSnapshot) => {
    if (!confirm(`恢复到 ${new Date(snapshot.createdAt).toLocaleString("zh-CN")} 的数据吗？`)) return;
    try { setData(await store.restoreSnapshot(snapshot.id)); notify("恢复记录已还原"); }
    catch { notify("无法恢复这条记录"); }
  };

  return <>
    <section className="card data-card migration-center">
      <header><div><h2>数据管理</h2><p>本地加密迁移 · 不上传内容</p></div><ShieldCheck /></header>
      <div className="migration-actions">
        <button className="primary full" disabled={busy} onClick={generate}><Link2 />生成迁移链接</button>
        <button className="secondary" onClick={onExport}><Download />导出备份</button>
        <button className="secondary" onClick={() => fileRef.current?.click()}><Upload />高级恢复</button>
      </div>
      <input aria-label="选择高级恢复文件" ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(event) => readFile(event.target.files?.[0])} />
      {link && <div className="migration-link"><label><span>私人迁移链接</span><textarea readOnly value={link} rows={3} /></label><button className="secondary full" onClick={async () => { try { await navigator.clipboard.writeText(link); notify("迁移链接已复制"); } catch { notify("请长按链接手动复制"); } }}>复制链接</button>{qr ? <><img src={qr} alt="Titia 迁移二维码" /><small><QrCode size={15} />在新设备扫码后确认导入</small></> : <small>完整数据包含图片，超过单个二维码容量；请复制迁移链接，数据不会被删减。</small>}</div>}
      <p>迁移链接包含完整私人备份，请只发送给自己的设备。</p>
    </section>
    <section className="card restore-history"><h2>恢复记录</h2>{history.length ? history.map((item) => <button key={item.id} onClick={() => restore(item)}><RotateCcw /><span><b>{item.label}</b><small>{new Date(item.createdAt).toLocaleString("zh-CN")} · {item.counts.total} 条</small></span></button>) : <p>导入前会自动留下可恢复记录。</p>}</section>
    {preview && <div className="sheet-backdrop"><section className="sheet migration-preview" role="dialog" aria-label="Titia 数据恢复"><header><div><small>全部在本机处理</small><h2>发现 Titia 数据恢复</h2></div></header><CountGrid counts={preview.counts} />{preview.warnings.map((warning) => <p className="danger" key={warning}>{warning}</p>)}<p>已有 ID 将跳过，不会覆盖当前数据。确认前已准备自动备份。</p><div className="button-row"><button className="secondary" onClick={() => { setPreview(null); if (preview.source === "link") window.history.replaceState(null, "", `${location.pathname}${location.search}`); }}>取消</button><button className="primary" disabled={busy} onClick={confirmImport}>确认导入</button></div></section></div>}
  </>;
}
