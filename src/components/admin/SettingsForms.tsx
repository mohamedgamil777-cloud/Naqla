"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveBranch, saveBusiness, type FormState } from "@/app/admin/actions";
import type { BranchDTO, BusinessSettings } from "@/data/types";

const inp = "w-full rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary";
const lbl = "block text-sm font-bold text-ink-2 mb-1.5";

function SaveBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-2xl px-6 py-3 font-bold bg-primary text-white disabled:opacity-50 self-start">
      {pending ? "بيحفظ…" : label}
    </button>
  );
}

function Ok({ state }: { state: FormState }) {
  if (state.error) return <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">{state.error}</div>;
  if (state.ok) return <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-semibold">تم الحفظ ✅</div>;
  return null;
}

export function SettingsForms({ branch, business }: { branch: BranchDTO; business: BusinessSettings }) {
  const [bState, bAction] = useActionState<FormState, FormData>(saveBranch, { ok: false });
  const [sState, sAction] = useActionState<FormState, FormData>(saveBusiness, { ok: false });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Branch */}
      <form action={bAction} className="bg-panel border border-line rounded-card p-5 flex flex-col gap-4">
        <h2 className="font-extrabold text-lg">الفرع</h2>
        <Ok state={bState} />
        <label><span className={lbl}>اسم الفرع</span><input className={inp} name="name" defaultValue={branch.name} required /></label>
        <label><span className={lbl}>العنوان</span><input className={inp} name="address" defaultValue={branch.address ?? ""} /></label>
        <div className="grid grid-cols-2 gap-4">
          <label><span className={lbl}>ميعاد الفتح (ساعة)</span><input className={inp} name="open" type="number" min="0" max="23" defaultValue={branch.working.open} /></label>
          <label><span className={lbl}>ميعاد القفل (ساعة)</span><input className={inp} name="close" type="number" min="1" max="24" defaultValue={branch.working.close} /></label>
        </div>
        <SaveBtn label="حفظ الفرع" />
      </form>

      {/* Business rules */}
      <form action={sAction} className="bg-panel border border-line rounded-card p-5 flex flex-col gap-4">
        <h2 className="font-extrabold text-lg">قواعد الحجز</h2>
        <Ok state={sState} />
        <div className="grid grid-cols-2 gap-4">
          <label><span className={lbl}>فاصل بين الحجوزات (دقيقة)</span><input className={inp} name="bufferMinutes" type="number" min="0" defaultValue={business.bufferMinutes} /></label>
          <label><span className={lbl}>أقل مدة (ساعة)</span><input className={inp} name="minHours" type="number" min="1" defaultValue={business.minHours} /></label>
          <label><span className={lbl}>أقصى مدة (ساعة)</span><input className={inp} name="maxHours" type="number" min="1" defaultValue={business.maxHours} /></label>
          <label><span className={lbl}>الحجز المسبق (يوم)</span><input className={inp} name="advanceDays" type="number" min="1" defaultValue={business.advanceDays} /></label>
          <label><span className={lbl}>مهلة «الآن» (ساعة)</span><input className={inp} name="nowLeadHours" type="number" min="0" defaultValue={business.nowLeadHours} /></label>
          <label><span className={lbl}>إلغاء مجاني قبل (ساعة)</span><input className={inp} name="freeCancelHours" type="number" min="0" defaultValue={business.freeCancelHours} /></label>
          <label><span className={lbl}>الضريبة (%)</span><input className={inp} name="vatPercent" type="number" min="0" max="100" step="0.5" defaultValue={Math.round(business.vatRate * 1000) / 10} /></label>
          <label><span className={lbl}>مدد الإيجار المتاحة</span><input className={inp} name="durationOptions" defaultValue={business.durationOptions.join("، ")} /></label>
        </div>
        <SaveBtn label="حفظ القواعد" />
      </form>
    </div>
  );
}
