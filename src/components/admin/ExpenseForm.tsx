"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addExpenseAction, type FormState } from "@/app/admin/actions";

const inp = "rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary";

export function ExpenseForm() {
  const [state, action] = useActionState<FormState, FormData>(addExpenseAction, { ok: false });
  return (
    <form action={action} className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
      <h2 className="font-extrabold">🧾 إضافة نثرية</h2>
      {state.error && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">{state.error}</div>}
      {state.ok && <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-semibold">تمت الإضافة ✅</div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-ink-2">المبلغ (جنيه)</span>
          <input name="amount" type="number" min="1" step="1" className={inp} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-ink-2">النوع</span>
          <input name="category" className={inp} placeholder="بنزين / صيانة / مرتبات…" required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-ink-2">ملاحظة (اختياري)</span>
          <input name="note" className={inp} />
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
      {pending ? "…" : "إضافة النثرية"}
    </button>
  );
}
