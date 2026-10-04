"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRef } from "react";
import { saveStaff, updateStaffRole, deleteStaff, type FormState } from "@/app/admin/actions";
import type { StaffDTO, StaffRole } from "@/data/types";

const ROLES: { value: StaffRole; label: string }[] = [
  { value: "super_admin", label: "مدير عام" },
  { value: "fleet_mgr", label: "مدير أسطول" },
  { value: "agent", label: "موظف حجوزات" },
  { value: "driver", label: "سائق" },
  { value: "finance", label: "حسابات" },
];
const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;

const inp = "rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary";
const lbl = "block text-xs font-bold text-ink-2 mb-1";

export function StaffManager({ staff }: { staff: StaffDTO[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveStaff, { ok: false });

  return (
    <div className="flex flex-col gap-5">
      {/* Add */}
      <form action={action} className="bg-panel border border-line rounded-card p-5 flex flex-col gap-3">
        <h2 className="font-extrabold">إضافة موظف</h2>
        {state.error && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">{state.error}</div>}
        {state.ok && <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-semibold">تمت الإضافة ✅</div>}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[160px]">
            <span className={lbl}>الاسم</span>
            <input className={`${inp} w-full`} name="name" placeholder="اسم الموظف" required />
          </label>
          <label className="flex-1 min-w-[160px]">
            <span className={lbl}>رقم الموبايل</span>
            <input className={`${inp} w-full`} name="phone" placeholder="01xxxxxxxxx" dir="ltr" required />
          </label>
          <label>
            <span className={lbl}>الوظيفة</span>
            <select className={inp} name="role" defaultValue="agent">
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <AddBtn />
        </div>
      </form>

      {/* List */}
      <div className="bg-panel border border-line rounded-card divide-y divide-line">
        {staff.map((s) => (
          <div key={s.id} className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[160px]">
              <div className="font-extrabold">{s.name}</div>
              <div className="text-muted text-sm" dir="ltr">{s.phone}</div>
            </div>
            <RoleSelect id={s.id} role={s.role} />
            <form action={deleteStaff}>
              <input type="hidden" name="id" value={s.id} />
              <button className="text-booked font-bold text-sm rounded-lg px-3 py-2 hover:bg-booked-soft">حذف</button>
            </form>
          </div>
        ))}
        {staff.length === 0 && <p className="text-muted p-4">مفيش موظفين مضافين.</p>}
      </div>
      <p className="text-muted text-sm">الصلاحيات الفعلية لكل وظيفة هتتفعّل مع تسجيل دخول الإدارة قريباً.</p>
    </div>
  );
}

function RoleSelect({ id, role }: { id: string; role: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={updateStaffRole}>
      <input type="hidden" name="id" value={id} />
      <select
        name="role"
        defaultValue={role}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-xl border border-line-2 bg-panel px-3 py-2 font-semibold"
        aria-label={`وظيفة ${roleLabel(role)}`}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
    </form>
  );
}

function AddBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-xl px-5 py-2.5 font-bold bg-primary text-white disabled:opacity-50">
      {pending ? "…" : "إضافة"}
    </button>
  );
}
