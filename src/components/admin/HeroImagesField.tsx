"use client";
import { useState } from "react";
import { fileToDataUrl } from "@/components/admin/ImageField";

const MAX = 8;

/** Admin: home carousel photos — add (several at once), reorder, remove. Posts as repeated "heroImages" fields. */
export function HeroImagesField({ defaultValue }: { defaultValue: string[] }) {
  const [images, setImages] = useState<string[]>(defaultValue);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, MAX - images.length);
    e.target.value = "";
    if (!files.length) return;
    setErr(null);
    setBusy(true);
    try {
      const added: string[] = [];
      for (const f of files) {
        if (f.size > 12 * 1024 * 1024) continue;
        added.push(await fileToDataUrl(f, 1600, 0.8));
      }
      setImages((list) => [...list, ...added].slice(0, MAX));
    } catch {
      setErr("مش قادر يقرأ صورة من الصور، جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  const move = (i: number, d: -1 | 1) =>
    setImages((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const next = list.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold text-ink-2">
        صور الرئيسية — عرض متحرك ({images.length}/{MAX})
        <span className="block text-xs text-muted font-normal">
          بتتقلب لوحدها كل 5 ثواني والعميل يقدر يسحبها. الأفضل صور عرضها أكبر من طولها. لو مفيش صور بيظهر الرسم الافتراضي.
        </span>
      </span>
      {images.map((src) => (
        <input key={src} type="hidden" name="heroImages" value={src} />
      ))}
      <div className="flex flex-wrap gap-3">
        {images.map((src, i) => (
          <div key={src} className="w-44 rounded-xl border border-line-2 bg-panel overflow-hidden">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`صورة ${i + 1}`} className="w-full aspect-[36/19] object-cover" />
              <span className="absolute top-1.5 right-1.5 rounded-full bg-ink/70 text-white text-xs font-bold px-2 py-0.5">{i + 1}</span>
            </div>
            <div className="flex items-center justify-between px-1.5 py-1">
              <span className="flex">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="w-8 h-8 rounded-lg hover:bg-panel-2 disabled:opacity-30" aria-label="قدّم">→</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="w-8 h-8 rounded-lg hover:bg-panel-2 disabled:opacity-30" aria-label="أخّر">←</button>
              </span>
              <button type="button" onClick={() => setImages((l) => l.filter((_, k) => k !== i))} className="text-booked text-sm font-bold px-2">
                مسح
              </button>
            </div>
          </div>
        ))}
        {images.length < MAX && (
          <label className="w-44 aspect-[36/19] rounded-xl border-2 border-dashed border-primary/50 text-primary font-bold grid place-items-center text-center cursor-pointer hover:bg-primary-soft px-2">
            {busy ? "بيحمّل…" : "+ إضافة صور"}
            <input type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
          </label>
        )}
      </div>
      {err && <span className="text-booked text-xs font-bold">{err}</span>}
      <span className="text-xs text-muted">متنساش تدوس «حفظ» تحت عشان التغيير يظهر للعملاء.</span>
    </div>
  );
}
