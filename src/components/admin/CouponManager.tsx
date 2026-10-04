"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveCoupon, deleteCoupon, type FormState } from "@/app/admin/actions";
import { formatEgp, piastresToEgp } from "@/lib/money";
import type { CouponDTO } from "@/data/types";

const inp = "rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary";

export function CouponManager({ coupons }: { coupons: CouponDTO[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveCoupon, { ok: false });

  return (
    <div className="flex flex-col gap-5">
      {/* Add */}
      <form action={action} className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
        <h2 className="font-extrabold">إضافة كوبون جديد</h2>
        {state.error && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">{state.error}</div>}
        {state.ok && <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-semibold">تم الحفظ ✅</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-ink-2">كود الكوبون</span>
            <input className={inp} name="code" placeholder="مثلاً: ترحيب" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-ink-2">نوع الخصم</span>
            <select className={inp} name="type" defaultValue="pct">
              <option value="pct">نسبة %</option>
              <option value="fixed">مبلغ ثابت (جنيه)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-ink-2">القيمة (نسبة أو جنيه)</span>
            <input className={inp} name="value" type="number" min="1" step="1" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-ink-2">أقل مبلغ للطلب (جنيه)</span>
            <input className={inp} name="minValue" type="number" min="0" step="1" defaultValue="0" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-ink-2">تاريخ الانتهاء (اختياري)</span>
            <input className={inp} name="validTo" type="date" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-ink-2">أقصى عدد استخدام (اختياري)</span>
            <input className={inp} name="maxUses" type="number" min="1" step="1" placeholder="غير محدود" />
          </label>
        </div>
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" name="active" defaultChecked className="w-5 h-5" /> مفعّل
        </label>
        <AddBtn />
      </form>

      {/* List */}
      <div className="flex flex-col gap-3">
        {coupons.length === 0 && <p className="text-muted text-center py-6">لسه مفيش كوبونات.</p>}
        {coupons.map((c) => (
          <CouponRow key={c.id} c={c} />
        ))}
      </div>
    </div>
  );
}

function CouponRow({ c }: { c: CouponDTO }) {
  const [state, action] = useActionState<FormState, FormData>(saveCoupon, { ok: false });
  return (
    <form action={action} className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
      <input type="hidden" name="id" value={c.id} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-lg">{c.code}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${c.active ? "bg-ok-soft text-ok" : "bg-off-soft text-off"}`}>
            {c.active ? "مفعّل" : "موقوف"}
          </span>
          <span className="text-sm text-muted">
            {c.type === "pct" ? `خصم ${c.value}%` : `خصم ${formatEgp(c.value)}`}
          </span>
        </div>
        <span className="text-xs text-muted">استُخدم {c.used} مرة</span>
      </div>
      {state.error && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">{state.error}</div>}
      {state.ok && <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-semibold">اتحفظ ✅</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-ink-2">الكود</span>
          <input className={inp} name="code" defaultValue={c.code} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-ink-2">نوع الخصم</span>
          <select className={inp} name="type" defaultValue={c.type}>
            <option value="pct">نسبة %</option>
            <option value="fixed">مبلغ ثابت (جنيه)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-ink-2">القيمة</span>
          <input className={inp} name="value" type="number" min="1" step="1" defaultValue={c.type === "pct" ? c.value : piastresToEgp(c.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-ink-2">أقل مبلغ للطلب (جنيه)</span>
          <input className={inp} name="minValue" type="number" min="0" step="1" defaultValue={piastresToEgp(c.minValue)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-ink-2">تاريخ الانتهاء</span>
          <input className={inp} name="validTo" type="date" defaultValue={c.validTo ?? ""} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-ink-2">أقصى عدد استخدام</span>
          <input className={inp} name="maxUses" type="number" min="1" step="1" defaultValue={c.maxUses ?? ""} placeholder="غير محدود" />
        </label>
      </div>
      <label className="flex items-center gap-2 font-semibold">
        <input type="checkbox" name="active" defaultChecked={c.active} className="w-5 h-5" /> مفعّل
      </label>
      <div className="flex gap-2">
        <SaveBtn />
        <DeleteBtn id={c.id} />
      </div>
    </form>
  );
}

function AddBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-xl px-5 py-2.5 font-bold bg-primary text-white disabled:opacity-50 self-start">
      {pending ? "…" : "إضافة الكوبون"}
    </button>
  );
}

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-xl px-5 py-2.5 font-bold bg-primary-soft text-primary-ink disabled:opacity-50">
      {pending ? "…" : "حفظ"}
    </button>
  );
}

function DeleteBtn({ id }: { id: string }) {
  return (
    <button
      formAction={deleteCoupon}
      name="id"
      value={id}
      className="rounded-xl px-5 py-2.5 font-bold text-booked border border-booked-soft hover:bg-booked-soft"
    >
      حذف
    </button>
  );
}
