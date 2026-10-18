"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { driverAdvanceOrder, type DriverActionState } from "@/app/driver/actions";
import { fileToDataUrl } from "@/components/admin/ImageField";
import { Icon } from "@/components/Icons";

/** The ONE big amber step for the driver, by status:
 *  assigned → "ابدأ الرحلة" · en_route → "تم الوصول لموقع الاستلام" · arrived → "تم التوصيل" (with proof of delivery). */
const NEXT: Record<string, { to: string; label: string }> = {
  assigned: { to: "en_route", label: "ابدأ الرحلة" },
  en_route: { to: "arrived", label: "تم الوصول لموقع الاستلام" },
  arrived: { to: "completed", label: "تم التوصيل" },
};

export function OrderActions({ code, status, openTrip = false }: { code: string; status: string; openTrip?: boolean }) {
  const [state, action] = useActionState<DriverActionState, FormData>(driverAdvanceOrder, { ok: false });
  const next = NEXT[status];
  if (!next) return null;
  const finishing = next.to === "completed";

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="to" value={next.to} />
      {openTrip && <input type="hidden" name="open" value="trip" />}
      {finishing && <ProofOfDelivery />}
      {state.error && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 font-bold text-center">{state.error}</div>}
      <SubmitBtn label={next.label} />
    </form>
  );
}

/** Recipient name + photo, required before "تم التوصيل". */
function ProofOfDelivery() {
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      setPhoto(await fileToDataUrl(file, 900, 0.72));
    } catch {
      setErr("مش قادر يقرأ الصورة، جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-panel border-2 border-accent rounded-card p-4 flex flex-col gap-3">
      <div className="font-extrabold text-lg flex items-center gap-2">
        <Icon name="checkCircle" className="w-6 h-6 text-primary" /> إثبات التسليم
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="font-bold">اسم اللي استلم</span>
        <input
          name="podName"
          required
          minLength={2}
          placeholder="مثلاً: أ. محمد — أمن العمارة"
          className="w-full rounded-xl border-2 border-line-2 bg-ground px-4 py-3 text-lg outline-none focus:border-primary focus:bg-panel"
        />
      </label>
      <input type="hidden" name="podPhoto" value={photo} />
      <div className="flex items-center gap-3">
        <div className="w-24 h-24 shrink-0 rounded-xl bg-panel-2 border border-line-2 overflow-hidden grid place-items-center text-muted">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="صورة التسليم" className="w-full h-full object-cover" />
          ) : (
            <Icon name="box" className="w-8 h-8" />
          )}
        </div>
        <label className="flex-1 min-h-[56px] rounded-2xl border-2 border-primary text-primary font-extrabold text-lg grid place-items-center cursor-pointer hover:bg-primary-soft">
          {busy ? "…" : photo ? "صوّر تاني" : "📷 صوّر الحاجة بعد التسليم"}
          <input type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
        </label>
      </div>
      {err && <span className="text-booked text-sm font-bold">{err}</span>}
    </div>
  );
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full min-h-[60px] rounded-2xl bg-accent text-on-accent text-xl font-extrabold flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(242,165,65,0.35)] hover:brightness-105 disabled:opacity-60"
    >
      {pending ? "لحظة…" : label}
      {!pending && <Icon name="chevronLeft" className="w-6 h-6" strokeWidth={2.6} />}
    </button>
  );
}
