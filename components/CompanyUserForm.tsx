"use client";
import { addCompanyUser } from "@/actions/customer/company";
import type { ActionResult } from "@/lib/action-result";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

const field =
  "rounded-xl border-2 border-line bg-panel px-3 py-2.5 outline-none focus:border-primary min-w-0 w-full";

/** The company admin adds a colleague: phone (for reset codes), name, username and password. */
export function CompanyUserForm() {
  const [s, action] = useActionState<ActionResult, FormData>(addCompanyUser, { ok: false });
  return (
    <form action={action} className="flex flex-col gap-2 border-t border-line pt-3">
      <h3 className="font-bold">ضيف مستخدم</h3>
      {s.error && (
        <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-bold">{s.error}</div>
      )}
      {s.ok && (
        <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-bold">
          اتضاف. يدخل باسم المستخدم وكلمة السر ويطلب باسم الشركة.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input name="name" placeholder="الاسم" className={field} />
        <input name="phone" dir="ltr" inputMode="tel" required placeholder="موبايله 01xxxxxxxxx" className={field} />
        <input
          name="username"
          dir="ltr"
          required
          autoCapitalize="none"
          spellCheck={false}
          placeholder="اسم المستخدم مثلاً ahmed.nour"
          className={field}
        />
        <input name="password" type="text" dir="ltr" minLength={6} placeholder="كلمة السر (6 على الأقل)" className={field} autoComplete="off" />
      </div>
      <p className="text-xs text-muted">
        اسم المستخدم بالإنجليزي. لو الشخص عنده حساب في انقلي بالفعل سيب كلمة السر فاضية ويدخل بكلمة سره. لو نسي
        كلمة السر، يغيّرها بكود بيوصله على موبايله من «نسيت كلمة السر؟».
      </p>
      <Btn text="إضافة" />
    </form>
  );
}

/** Set or change one user's username, and a new password when typed (company admin or staff). */
export function CompanyUserLoginForm({
  action: serverAction,
  memberId,
  companyId,
  username,
}: {
  action: (p: ActionResult, fd: FormData) => Promise<ActionResult>;
  memberId: string;
  companyId?: string;
  username: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [s, action] = useActionState<ActionResult, FormData>(serverAction, { ok: false });
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-bold text-primary">
        {username ? "بيانات الدخول" : "اعمل اسم مستخدم"}
      </button>
    );
  return (
    <form action={action} className="flex flex-col gap-2 w-full mt-2">
      <input type="hidden" name="id" value={memberId} />
      {companyId && <input type="hidden" name="companyId" value={companyId} />}
      {s.error && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-bold">{s.error}</div>}
      {s.ok && <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-bold">اتحفظ.</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          name="username"
          dir="ltr"
          required
          defaultValue={username ?? ""}
          autoCapitalize="none"
          spellCheck={false}
          placeholder="اسم المستخدم"
          className={field}
        />
        <input name="password" type="text" dir="ltr" minLength={6} placeholder="كلمة سر جديدة (اختياري)" className={field} autoComplete="off" />
      </div>
      <div className="flex items-center gap-2">
        <Btn text="حفظ" />
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-bold text-ink-2 px-2">
          إغلاق
        </button>
      </div>
    </form>
  );
}

function Btn({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="self-start rounded-xl bg-primary text-white px-5 py-2.5 font-bold disabled:opacity-50">
      {pending ? "…" : text}
    </button>
  );
}
