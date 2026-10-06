"use client";
import { ImageField } from "@/components/admin/ImageField";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveCategory, deleteCategory, type FormState } from "@/app/admin/actions";
import { piastresToEgp } from "@/lib/money";
import type { CategoryDTO } from "@/data/types";

const inp = "rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary w-full";
const lbl = "text-xs font-bold text-ink-2";

function Fields({ c }: { c?: CategoryDTO }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <label className="flex flex-col gap-1 col-span-2 sm:col-span-1">
        <span className={lbl}>الاسم</span>
        <input className={inp} name="name" defaultValue={c?.name ?? ""} placeholder="مثلاً: سوزوكي فان" required />
      </label>
      <label className="flex flex-col gap-1">
        <span className={lbl}>الفئة</span>
        <select className={inp} name="kind" defaultValue={c?.kind ?? "pickup"}>
          <option value="pickup">بيك أب</option>
          <option value="van">فان</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={lbl}>الحجم</span>
        <select className={inp} name="sizeCode" defaultValue={c?.sizeCode ?? ""}>
          <option value="">— مش حجم للعميل —</option>
          <option value="XS">XS</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={lbl}>الحمولة (كجم)</span>
        <input className={inp} name="capacityKg" type="number" min="0" defaultValue={c?.capacityKg ?? ""} placeholder="700" />
      </label>
      <label className="flex flex-col gap-1">
        <span className={lbl}>المقاس (سم)</span>
        <input className={inp} name="dims" defaultValue={c?.dims ?? ""} placeholder="170×160×100" />
      </label>
      <label className="flex flex-col gap-1 col-span-2 sm:col-span-3">
        <span className={lbl}>وصف مختصر (مناسب لـ…)</span>
        <input className={inp} name="description" defaultValue={c?.description ?? ""} placeholder="صناديق صغيرة، كراسي، ثلاجات" />
      </label>
      <label className="flex flex-col gap-1">
        <span className={lbl}>سعر البداية (جنيه)</span>
        <input className={inp} name="baseFare" type="number" min="0" defaultValue={c ? piastresToEgp(c.baseFare) : ""} placeholder="70" />
      </label>
      <label className="flex flex-col gap-1">
        <span className={lbl}>سعر الكيلومتر (جنيه)</span>
        <input className={inp} name="perKm" type="number" min="0" step="0.5" defaultValue={c ? piastresToEgp(c.perKm) : ""} placeholder="6" />
      </label>
      <div className="col-span-2 sm:col-span-3">
        <ImageField name="image" label="صورة العربية (بتظهر للعميل في الرئيسية وشاشة الطلب)" defaultValue={c?.image} camera={false} maxWidth={900} />
      </div>
    </div>
  );
}

export function CategoryManager({ categories, usedIds = [] }: { categories: CategoryDTO[]; usedIds?: string[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveCategory, { ok: false });
  const used = new Set(usedIds);

  return (
    <div className="flex flex-col gap-5">
      {/* Add */}
      <form action={action} className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
        <h2 className="font-extrabold">إضافة نوع / حجم جديد</h2>
        {state.error && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">{state.error}</div>}
        {state.ok && <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-semibold">تم الحفظ ✅</div>}
        <Fields />
        <AddBtn />
      </form>

      {/* List */}
      <div className="flex flex-col gap-3">
        {categories.map((c) => (
          <CategoryRow key={c.id} c={c} used={used.has(c.id)} />
        ))}
      </div>
      <p className="text-muted text-sm">
        «الحجم» (XS/S/M/L) هو اللي العميل بيختار منه في التوصيل. النوع من غير حجم مش هيظهر للعميل.
        مينفعش تحذف نوع مرتبط بعربيات — غيّر نوع العربيات الأول.
      </p>
    </div>
  );
}

function CategoryRow({ c, used }: { c: CategoryDTO; used: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(saveCategory, { ok: false });
  return (
    <form action={action} className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
      <input type="hidden" name="id" value={c.id} />
      <div className="flex items-center gap-2">
        <span className="font-extrabold text-lg">{c.name}</span>
        {c.sizeCode && <span className="rounded-full bg-primary-soft text-primary-ink px-2.5 py-0.5 text-xs font-bold">{c.sizeCode}</span>}
      </div>
      {state.error && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">{state.error}</div>}
      {state.ok && <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-semibold">اتحفظ ✅</div>}
      <Fields c={c} />
      <div className="flex gap-2">
        <SaveBtn />
        {used ? (
          <span className="rounded-xl px-4 py-2 font-bold text-muted bg-panel-2" title="النوع ده مستخدم في عربيات">مستخدمة</span>
        ) : (
          <button formAction={deleteCategory} name="id" value={c.id} className="rounded-xl px-4 py-2 font-bold text-booked border border-booked-soft hover:bg-booked-soft">
            حذف
          </button>
        )}
      </div>
    </form>
  );
}

function AddBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-xl px-5 py-2.5 font-bold bg-primary text-white disabled:opacity-50 self-start">
      {pending ? "…" : "إضافة"}
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
