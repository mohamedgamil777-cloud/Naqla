"use client";
import { useState } from "react";

/** Downscale an uploaded image to a compact JPEG data URL (client-side). */
function fileToDataUrl(file: File, maxW = 1100, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("no-canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("img-error"));
    };
    img.src = url;
  });
}

/** A labelled image picker that stores a data URL into a hidden form field. */
export function ImageField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | null }) {
  const [value, setValue] = useState<string>(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    if (file.size > 8 * 1024 * 1024) {
      setErr("الصورة كبيرة جداً.");
      return;
    }
    setBusy(true);
    try {
      setValue(await fileToDataUrl(file));
    } catch {
      setErr("مش قادر يقرأ الصورة.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-ink-2">{label}</span>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 shrink-0 rounded-xl bg-panel-2 border border-line-2 overflow-hidden grid place-items-center text-2xl text-muted">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="w-full h-full object-cover" />
          ) : (
            <span>🖼️</span>
          )}
        </div>
        <label className="rounded-xl bg-primary-soft text-primary-ink px-4 py-2 font-bold tap cursor-pointer">
          {busy ? "…" : value ? "تغيير الصورة" : "رفع صورة"}
          <input type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
        </label>
        {value && (
          <button type="button" onClick={() => setValue("")} className="text-booked text-sm font-bold tap">
            مسح
          </button>
        )}
      </div>
      {err && <span className="text-booked text-xs font-bold">{err}</span>}
    </div>
  );
}
