"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addCompanyUser, type CompanyActionState } from "@/app/(customer)/company/actions";

/** Owner adds a colleague by phone (they log in with it and order for the company). */
export function CompanyUserForm() {
  const [s, action] = useActionState<CompanyActionState, FormData>(addCompanyUser, { ok: false });
  return (
    <form action={action} className="flex flex-col gap-2">
      {s.error && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-bold">{s.error}</div>}
      {s.ok && <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-bold">اتضاف ✅ يقدر يدخل برقمه ويطلب باسم الشركة</div>}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <input name="phone" dir="ltr" required placeholder="01xxxxxxxxx" className="rounded-xl border-2 border-line bg-panel px-3 py-2.5 outline-none focus:border-primary min-w-0" />
        <input name="name" placeholder="الاسم" className="rounded-xl border-2 border-line bg-panel px-3 py-2.5 outline-none focus:border-primary min-w-0" />
        <Btn />
      </div>
    </form>
  );
}

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-xl bg-primary text-white px-4 font-bold disabled:opacity-50">
      {pending ? "…" : "إضافة"}
    </button>
  );
}
