"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  saveCompanyAction,
  addMemberAction,
  addCompanyPaymentAction,
  type CompanyFormState,
} from "@/app/admin/companies/actions";
import { piastresToEgp } from "@/lib/money";
import type { CompanyDTO } from "@/data/types";

const inp = "w-full rounded-xl border border-line-2 bg-panel px-3 py-2.5 outline-none focus:border-primary";
const lbl = "text-xs font-bold text-ink-2";

function Status({ s, okText = "تم الحفظ ✅" }: { s: CompanyFormState; okText?: string }) {
  if (s.error) return <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-bold">{s.error}</div>;
  if (s.ok) return <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-bold">{okText}</div>;
  return null;
}
function Btn({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="self-start rounded-xl bg-primary text-white px-5 py-2.5 font-bold disabled:opacity-50">
      {pending ? "…" : children}
    </button>
  );
}

/** Create (no company) or edit a company. */
export function CompanyForm({ c }: { c?: CompanyDTO }) {
  const [s, action] = useActionState<CompanyFormState, FormData>(saveCompanyAction, { ok: false });
  return (
    <form action={action} className="flex flex-col gap-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Status s={s} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={lbl}>اسم الشركة</span>
          <input className={inp} name="name" required defaultValue={c?.name} placeholder="مثلاً: معرض الأثاث الحديث" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>تليفون الشركة</span>
          <input className={inp} name="phone" dir="ltr" defaultValue={c?.phone ?? ""} placeholder="01xxxxxxxxx" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>الرقم الضريبي (اختياري)</span>
          <input className={inp} name="taxNumber" dir="ltr" defaultValue={c?.taxNumber ?? ""} />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={lbl}>العنوان (بيظهر في الكشف)</span>
          <input className={inp} name="address" defaultValue={c?.address ?? ""} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>خصم الشركة على كل طلب (%)</span>
          <input className={inp} name="discountPct" type="number" min="0" max="100" defaultValue={c?.discountPct ?? 0} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>طريقة الدفع</span>
          <select className={inp} name="billing" defaultValue={c?.billing ?? "monthly"}>
            <option value="monthly">على الحساب — كشف شهري</option>
            <option value="cash">كاش مع كل رحلة</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>حد الائتمان (جنيه، 0 = مفتوح)</span>
          <input className={inp} name="creditLimit" type="number" min="0" defaultValue={c ? piastresToEgp(c.creditLimit) : 0} />
        </label>
        {c && (
          <label className="flex items-center gap-2 font-bold text-sm self-end pb-2.5 cursor-pointer">
            <input type="checkbox" name="active" defaultChecked={c.active} className="w-5 h-5 accent-[var(--color-primary)]" />
            الحساب شغّال
          </label>
        )}
      </div>
      <Btn>{c ? "حفظ التعديلات" : "إضافة الشركة"}</Btn>
    </form>
  );
}

export function MemberForm({ companyId }: { companyId: string }) {
  const [s, action] = useActionState<CompanyFormState, FormData>(addMemberAction, { ok: false });
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="companyId" value={companyId} />
      <Status s={s} okText="اتضاف ✅ — يقدر يدخل برقمه ويطلب باسم الشركة" />
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2">
        <input className={inp} name="phone" dir="ltr" required placeholder="موبايل المستخدم 01xxxxxxxxx" />
        <input className={inp} name="name" placeholder="الاسم" />
        <select className={inp} name="role" defaultValue="member">
          <option value="member">مستخدم</option>
          <option value="owner">مدير الحساب</option>
        </select>
        <Btn>إضافة</Btn>
      </div>
    </form>
  );
}

export function PaymentForm({ companyId }: { companyId: string }) {
  const [s, action] = useActionState<CompanyFormState, FormData>(addCompanyPaymentAction, { ok: false });
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="companyId" value={companyId} />
      <Status s={s} okText="اتسجّلت الدفعة ✅" />
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-2">
        <input className={inp} name="amount" type="number" min="1" step="0.01" required placeholder="المبلغ (جنيه)" />
        <select className={inp} name="method" defaultValue="bank">
          <option value="bank">تحويل بنكي</option>
          <option value="cash">كاش</option>
          <option value="wallet">محفظة</option>
        </select>
        <input className={inp} name="note" placeholder="ملاحظة (رقم التحويل…)" />
        <Btn>تسجيل الدفعة</Btn>
      </div>
    </form>
  );
}
