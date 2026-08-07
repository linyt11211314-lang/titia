import { useEffect, useMemo, useRef, useState } from "react";

type Props = { name: string; label: string; multiple?: boolean };

export function ImagePicker({ name, label, multiple = true }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => urls.forEach(URL.revokeObjectURL), [urls]);

  const sync = (next: File[]) => {
    setFiles(next);
    if (!input.current) return;
    try {
      const transfer = new DataTransfer();
      next.forEach((file) => transfer.items.add(file));
      input.current.files = transfer.files;
    } catch {
      // iOS keeps the original selection; visual removal still applies before reselection.
    }
  };

  return <fieldset className="image-picker"><legend>{label}</legend><div className="image-picker-grid">
    {urls.map((url, index) => <figure key={url}><img src={url} alt={`图片预览 ${index + 1}`} /><button type="button" aria-label={`删除图片 ${index + 1}`} onClick={() => sync(files.filter((_, item) => item !== index))}>×</button></figure>)}
    <label className="image-add"><span>＋</span><small>添加图片</small><input ref={input} aria-label={name === "petImages" ? "成长图片（可选）" : label} name={name} type="file" accept="image/*" multiple={multiple} onChange={(event) => sync([...(event.target.files ?? [])])} /></label>
  </div></fieldset>;
}
