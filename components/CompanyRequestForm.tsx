"use client";
/** «للشركات»: ask for a company account. Staff see it in admin → الشركات and call back. */
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestCompanyAccountAction } from "@/actions/customer/company-request";
import type { ActionResult } from "@/lib/action-result";
import { Icon } from "@/components/Icons";
import { inputClass } from "@/components/ui";

export function CompanyRequestForm({ phone, name }: { phone?: string; name?: string }) {
  const [s, action] = useActionState<ActionResult, FormData>(requestCompanyAccountAction, { ok: false });

  if (s.ok)
    return (
      <div className="bg-ok-soft text-ok rounded-card p-4 font-bold flex items-start gap-2" role="status">
        <Icon name="checkCircle" className="w-5 h-5 shrink-0 mt-0.5" />
        <span>
          وصلنا طلبك. هنكلمك في أقرب وقت في مواعيد العمل عشان نتفق على السعر وطريقة الدفع ونفتح الحساب.
        </span>
      </div>
    );

  return (
    <form action={action} className="flex flex-col gap-3">
      {s.error && (
        <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-bold" role="alert">
          {s.error}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">اسم الشركة أو المحل</span>
          <input name="companyName" required maxLength={160} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">اسم المسؤول</span>
          <input name="contactName" required maxLength={120} defaultValue={name} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">موبايل المسؤول</span>
          <input
            name="phone"
            required
            dir="ltr"
            inputMode="tel"
            placeholder="01xxxxxxxxx"
            defaultValue={phone}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">عدد المشاوير المتوقع في الشهر</span>
          <select name="monthlyTrips" defaultValue="" className={inputClass}>
            <option value="">مش متأكد</option>
            <option value="أقل من 10">أقل من 10</option>
            <option value="10 لـ 30">10 لـ 30</option>
            <option value="30 لـ 100">30 لـ 100</option>
            <option value="أكتر من 100">أكتر من 100</option>
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">بتنقلوا إيه ومنين لفين؟ (اختياري)</span>
        <textarea
          name="note"
          rows={3}
          maxLength={1000}
          placeholder="مثلاً: بضاعة من المخزن في العبور لـ 3 فروع في القاهرة"
          className={inputClass}
        />
      </label>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="tap self-start rounded-xl bg-primary text-white px-6 py-3 font-extrabold disabled:opacity-50"
    >
      {pending ? "بنبعت…" : "اطلب حساب شركة"}
    </button>
  );
}
