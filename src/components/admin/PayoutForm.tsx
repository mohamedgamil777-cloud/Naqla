"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addDriverPayoutAction, type FormState } from "@/app/admin/actions";
import type { StaffDTO } from "@/data/types";

const inp = "rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary";

export function PayoutForm({ drivers }: { drivers: StaffDTO[] }) {
  const [state, action] = useActionState<FormState, FormData>(addDriverPayoutAction, { ok: false });
  return (
    <form action={action} className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
      <h2 className="font-extrabold">💵 تسجيل تسديد لسائق</h2>
      {state.error && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">{state.error}</div>}
      {state.ok && <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-semibold">تم تسجيل التسديد ✅</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-ink-2">السائق</span>
          <select name="driverId" className={inp} required>
            <option value="">— اختار السائق —</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-ink-2">المبلغ (جنيه)</span>
          <input name="amount" type="number" min="1" step="1" className={inp} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-ink-2">طريقة الدفع</span>
          <select name="method" className={inp} defaultValue="cash">
            <option value="cash">كاش</option>
            <option value="bank">تحويل بنكي</option>
            <option value="wallet">محفظة إلكترونية</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-ink-2">ملاحظة (اختياري)</span>
          <input name="note" className={inp} placeholder="مثلاً: تسوية أسبوع" />
        </label>
      </div>
      <SubmitBtn />
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-xl px-5 py-2.5 font-bold bg-primary text-white disabled:opacity-50 self-start">
      {pending ? "…" : "تسجيل التسديد"}
    </button>
  );
}
