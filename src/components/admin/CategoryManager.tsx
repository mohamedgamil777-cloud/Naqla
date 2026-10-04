"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveCategory, renameCategory, deleteCategory, type FormState } from "@/app/admin/actions";
import type { CategoryDTO } from "@/data/types";

const inp = "rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary";

export function CategoryManager({ categories, usedIds = [] }: { categories: CategoryDTO[]; usedIds?: string[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveCategory, { ok: false });
  const used = new Set(usedIds);

  return (
    <div className="flex flex-col gap-5">
      {/* Add */}
      <form action={action} className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
        <h2 className="font-extrabold">إضافة نوع جديد</h2>
        {state.error && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">{state.error}</div>}
        <div className="flex flex-wrap gap-3">
          <input className={`${inp} flex-1 min-w-[180px]`} name="name" placeholder="اسم النوع (مثلاً: بيك أب دبل كابينة)" required />
          <select className={inp} name="kind" defaultValue="pickup">
            <option value="pickup">بيك أب</option>
            <option value="van">فان</option>
          </select>
          <AddBtn />
        </div>
      </form>

      {/* List */}
      <div className="bg-panel border border-line rounded-card divide-y divide-line">
        {categories.map((c) => (
          <div key={c.id} className="p-3 flex flex-wrap items-center gap-2">
            <form action={renameCategory} className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
              <input type="hidden" name="id" value={c.id} />
              <input className={`${inp} flex-1 min-w-[160px]`} name="name" defaultValue={c.name} />
              <select className={inp} name="kind" defaultValue={c.kind}>
                <option value="pickup">بيك أب</option>
                <option value="van">فان</option>
              </select>
              <button className="rounded-xl px-4 py-2 font-bold bg-primary-soft text-primary-ink">حفظ</button>
            </form>
            {used.has(c.id) ? (
              <span className="rounded-xl px-4 py-2 font-bold text-muted bg-panel-2" title="النوع ده مستخدم في عربيات">
                مستخدمة
              </span>
            ) : (
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={c.id} />
                <button className="rounded-xl px-4 py-2 font-bold text-booked border border-booked-soft hover:bg-booked-soft">حذف</button>
              </form>
            )}
          </div>
        ))}
      </div>
      <p className="text-muted text-sm">مينفعش تحذف نوع مرتبط بعربيات — بيظهر «مستخدمة». غيّر نوع العربيات الأول عشان تقدر تحذفه.</p>
    </div>
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
