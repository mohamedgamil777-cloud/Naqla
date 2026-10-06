"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveStaff, deleteStaff, type FormState } from "@/app/admin/actions";
import { ImageField } from "@/components/admin/ImageField";
import type { StaffDTO, StaffRole } from "@/data/types";

const ROLES: { value: StaffRole; label: string }[] = [
  { value: "super_admin", label: "مدير عام" },
  { value: "fleet_mgr", label: "مدير أسطول" },
  { value: "agent", label: "موظف حجوزات" },
  { value: "driver", label: "سائق" },
  { value: "finance", label: "حسابات" },
];
const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;

const inp = "rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary w-full";
const lbl = "text-xs font-bold text-ink-2";

export function StaffManager({ staff }: { staff: StaffDTO[] }) {
  return (
    <div className="flex flex-col gap-5">
      <StaffForm />
      <div className="flex flex-col gap-3">
        {staff.map((s) => <StaffForm key={s.id} staff={s} />)}
        {staff.length === 0 && <p className="text-muted p-4">مفيش موظفين مضافين.</p>}
      </div>
      <p className="text-muted text-sm">بيانات السائق (الرخص والصور) بتظهر له في صفحته، وبتساعد الإدارة وقت التوصيل.</p>
    </div>
  );
}

function StaffForm({ staff }: { staff?: StaffDTO }) {
  const [state, action] = useActionState<FormState, FormData>(saveStaff, { ok: false });
  const [role, setRole] = useState<StaffRole>(staff?.role ?? "agent");
  const isEdit = !!staff;

  return (
    <form action={action} className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
      {isEdit && <input type="hidden" name="id" value={staff.id} />}
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold">{isEdit ? staff.name || "موظف" : "إضافة موظف"}</h2>
        {isEdit && <span className="rounded-full bg-primary-soft text-primary-ink px-2.5 py-0.5 text-xs font-bold">{roleLabel(role)}</span>}
      </div>
      {state.error && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">{state.error}</div>}
      {state.ok && <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-semibold">تم الحفظ ✅</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className={lbl}>الاسم</span>
          <input className={inp} name="name" defaultValue={staff?.name ?? ""} placeholder="اسم الموظف" required />
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>رقم الموبايل</span>
          <input className={inp} name="phone" defaultValue={staff?.phone ?? ""} placeholder="01xxxxxxxxx" dir="ltr" required />
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>الوظيفة</span>
          <select className={inp} name="role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>الرقم القومي</span>
          <input className={inp} name="nationalId" defaultValue={staff?.nationalId ?? ""} placeholder="١٤ رقم" dir="ltr" />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        <ImageField name="photo" label="📷 الصورة الشخصية" defaultValue={staff?.photo} />
        {role === "driver" && <ImageField name="drivingLicense" label="🪪 رخصة القيادة" defaultValue={staff?.drivingLicense} />}
        {role === "driver" && <ImageField name="vehicleLicense" label="🚗 رخصة العربية" defaultValue={staff?.vehicleLicense} />}
      </div>

      <div className="flex gap-2">
        <SaveBtn isEdit={isEdit} />
        {isEdit && (
          <button formAction={deleteStaff} name="id" value={staff.id} className="rounded-xl px-4 py-2.5 font-bold text-booked border border-booked-soft hover:bg-booked-soft">
            حذف
          </button>
        )}
      </div>
    </form>
  );
}

function SaveBtn({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-xl px-5 py-2.5 font-bold bg-primary text-white disabled:opacity-50">
      {pending ? "…" : isEdit ? "حفظ التعديلات" : "إضافة الموظف"}
    </button>
  );
}
