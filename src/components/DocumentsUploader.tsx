"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveCustomerDocument, deleteCustomerDocument, type DocState } from "@/app/(customer)/account/actions";
import type { DocumentDTO, DocumentType } from "@/data/types";

function fileToDataUrl(file: File, maxW = 1400, quality = 0.8): Promise<string> {
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

export function DocumentsUploader({ docs }: { docs: DocumentDTO[] }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <DocUpload type="national_id" title="صوّر البطاقة الشخصية" existing={docs.find((d) => d.type === "national_id")} />
      <DocUpload type="license" title="صوّر رخصة القيادة" withExpiry existing={docs.find((d) => d.type === "license")} />
    </div>
  );
}

function DocUpload({
  type,
  title,
  existing,
  withExpiry,
}: {
  type: DocumentType;
  title: string;
  existing?: DocumentDTO;
  withExpiry?: boolean;
}) {
  const [state, action] = useActionState<DocState, FormData>(saveCustomerDocument, { ok: false });
  const [url, setUrl] = useState<string>(existing?.url ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      setUrl(await fileToDataUrl(file));
    } catch {
      setErr("مش قادر يقرأ الصورة.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold">{title}</h3>
        {existing && <span className="text-ok text-sm font-bold">مرفوعة ✅</span>}
      </div>

      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-panel-2 border border-line-2">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted">📷 لسه مفيش صورة</div>
        )}
      </div>

      {err && <span className="text-booked text-sm font-semibold">{err}</span>}
      {state.error && <span className="text-booked text-sm font-semibold">{state.error}</span>}
      {state.ok && <span className="text-ok text-sm font-semibold">تم الحفظ ✅</span>}

      <label className="tap bg-panel-2 border-2 border-line-2 rounded-2xl py-3 text-center font-bold cursor-pointer">
        {busy ? "بيحمّل…" : url ? "📷 صوّر تاني" : "📷 صوّر / اختار صورة"}
        <input type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
      </label>

      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="url" value={url} />
        {withExpiry && (
          <label className="block">
            <span className="text-sm font-bold text-ink-2">تاريخ انتهاء الرخصة</span>
            <input
              name="expiry"
              type="date"
              defaultValue={existing?.expiry ?? ""}
              className="w-full mt-1 rounded-xl border-2 border-line-2 bg-panel px-3 py-2.5"
            />
          </label>
        )}
        <SaveBtn disabled={!url} />
      </form>
      {existing && (
        <form action={deleteCustomerDocument}>
          <input type="hidden" name="id" value={existing.id} />
          <button className="w-full rounded-2xl px-5 py-2.5 font-bold text-booked border-2 border-booked-soft">حذف المستند</button>
        </form>
      )}
    </div>
  );
}

function SaveBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="flex-1 rounded-2xl py-3 font-bold bg-primary text-white disabled:opacity-40"
    >
      {pending ? "بيحفظ…" : "حفظ المستند"}
    </button>
  );
}

