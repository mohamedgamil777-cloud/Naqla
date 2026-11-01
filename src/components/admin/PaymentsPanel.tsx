"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { adminAddPayment, adminRefundPayment, adminDeletePayment, type FormState } from "@/app/admin/actions";
import { formatEgp } from "@/lib/money";
import type { PaymentDTO } from "@/data/types";

const inp = "rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary";
const lbl = "block text-xs font-bold text-ink-2 mb-1";
const methodLabel = (m: string) => (m === "cash" ? "كاش" : m === "card" ? "كارت" : "أونلاين");

export function PaymentsPanel({
  code,
  payments,
  dueTotal,
  depositDue,
}: {
  code: string;
  payments: PaymentDTO[];
  dueTotal: number;
  depositDue: number;
}) {
  const [state, action] = useActionState<FormState, FormData>(adminAddPayment, { ok: false });

  const paidRent = payments.filter((p) => p.kind === "rent").reduce((s, p) => s + p.amount, 0);
  const depositHeld = payments.filter((p) => p.kind === "deposit" && p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, dueTotal - paidRent);

  return (
    <div className="bg-panel border border-line rounded-card p-5 flex flex-col gap-4">
      <h2 className="font-extrabold text-lg">المدفوعات والتأمين</h2>

      {/* summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="المطلوب (إيجار)" value={formatEgp(dueTotal)} />
        <Tile label="المدفوع" value={formatEgp(paidRent)} tone="ok" />
        <Tile label="المتبقي" value={formatEgp(balance)} tone={balance > 0 ? "warn" : "ok"} />
        <Tile label="التأمين المحتجز" value={formatEgp(depositHeld)} sub={`المطلوب ${formatEgp(depositDue)}`} />
      </div>

      {/* list */}
      {payments.length > 0 && (
        <div className="flex flex-col divide-y divide-line border-t border-line pt-1">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2.5 gap-2 flex-wrap">
              <div>
                <span className="font-bold">{formatEgp(p.amount)}</span>
                <span className="text-muted text-sm ms-2">
                  {p.kind === "deposit" ? "تأمين" : "إيجار"} · {methodLabel(p.method)}
                  {p.status === "refunded" && " · مسترد"}
                </span>
                {p.note && <span className="text-muted text-xs block">{p.note}</span>}
              </div>
              <div className="flex gap-1.5">
                {p.kind === "deposit" && p.status === "paid" && (
                  <form action={adminRefundPayment}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="code" value={code} />
                    <button className="text-reserved font-bold text-sm rounded-lg px-3 py-1.5 hover:bg-reserved-soft">استرجاع التأمين</button>
                  </form>
                )}
                <form action={adminDeletePayment}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="code" value={code} />
                  <button className="text-booked font-bold text-sm rounded-lg px-3 py-1.5 hover:bg-booked-soft">حذف</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* add */}
      <form action={action} className="border-t border-line pt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="code" value={code} />
        {state.error && <div className="w-full bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">{state.error}</div>}
        {state.ok && <div className="w-full bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-semibold">تم تسجيل الدفعة ✅</div>}
        <label>
          <span className={lbl}>المبلغ (جنيه)</span>
          <input className={`${inp} w-32`} name="amount" type="number" min="0" step="10" required />
        </label>
        <label>
          <span className={lbl}>النوع</span>
          <select className={inp} name="kind" defaultValue="rent">
            <option value="rent">إيجار</option>
            <option value="deposit">تأمين</option>
          </select>
        </label>
        <label>
          <span className={lbl}>الطريقة</span>
          <select className={inp} name="method" defaultValue="cash">
            <option value="cash">كاش</option>
            <option value="card">كارت</option>
            <option value="online">أونلاين</option>
          </select>
        </label>
        <label className="flex-1 min-w-[140px]">
          <span className={lbl}>ملاحظة (اختياري)</span>
          <input className={`${inp} w-full`} name="note" />
        </label>
        <AddBtn />
      </form>
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ok" | "warn" }) {
  const color = tone === "ok" ? "text-ok" : tone === "warn" ? "text-rented" : "text-ink";
  return (
    <div className="rounded-xl bg-panel-2 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-lg font-extrabold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function AddBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-xl px-5 py-2.5 font-bold bg-primary text-white disabled:opacity-50">
      {pending ? "…" : "سجّل دفعة"}
    </button>
  );
}
