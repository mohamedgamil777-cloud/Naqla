"use client";
import { saveCategory, deleteCategoryAction, toggleCategoryActive } from "@/actions/admin/categories";
import type { ActionResult } from "@/lib/action-result";
import { ImageField } from "@/components/admin/ImageField";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { piastresToEgp } from "@/lib/money";
import type { CategoryDTO } from "@/types";

const inp =
  "rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary w-full";
const lbl = "text-xs font-bold text-ink-2";

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-extrabold">{title}</h3>
        {note && <p className="text-xs text-muted">{note}</p>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>
    </section>
  );
}

function Fields({ c }: { c?: CategoryDTO }) {
  return (
    <div className="flex flex-col gap-6">
      <Section title="اللي بيشوفه العميل" note="بيظهر في الرئيسية وصفحة «عربياتنا» وشاشة الطلب.">
        <label className="flex flex-col gap-1 col-span-2 sm:col-span-1">
          <span className={lbl}>اسم النوع *</span>
          <input
            className={inp}
            name="name"
            defaultValue={c?.name ?? ""}
            placeholder="مثلاً: جامبو"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>أقصى حمولة (كجم)</span>
          <input
            className={inp}
            name="capacityKg"
            type="number"
            min="0"
            defaultValue={c?.capacityKg ?? ""}
            placeholder="1500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>مقاس الصندوق</span>
          <input className={inp} name="dims" defaultValue={c?.dims ?? ""} placeholder="3.2 × 1.9 م" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>حجم الصندوق (م³)</span>
          <input
            className={inp}
            name="volumeM3"
            type="number"
            min="0"
            step="0.1"
            defaultValue={c?.volumeM3 ?? ""}
            placeholder="6.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>شكل الصندوق</span>
          <select className={inp} name="bodyType" defaultValue={c?.bodyType ?? ""}>
            <option value="">—</option>
            <option value="closed">صندوق مقفول</option>
            <option value="open">صندوق مفتوح</option>
            <option value="covered">مفتوح بتندة</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 col-span-2 sm:col-span-3">
          <span className={lbl}>وصف مختصر</span>
          <input
            className={inp}
            name="description"
            defaultValue={c?.description ?? ""}
            placeholder="مناسبة لنقل شقة غرفتين"
          />
        </label>
        <label className="flex flex-col gap-1 col-span-2 sm:col-span-3">
          <span className={lbl}>بتشيل إيه؟ (كل حاجة في سطر)</span>
          <textarea
            className={inp}
            name="features"
            rows={3}
            defaultValue={c?.features ?? ""}
            placeholder={"عفش أوضة نوم كاملة\nثلاجة + غسالة + بوتاجاز\nلحد 40 كرتونة"}
          />
        </label>
        <div className="col-span-2 sm:col-span-3">
          <ImageField
            name="image"
            label="صورة النوع"
            defaultValue={c?.image}
            camera={false}
            maxWidth={900}
            wide
          />
        </div>
      </Section>

      <Section title="السعر">
        <label className="flex flex-col gap-1">
          <span className={lbl}>سعر البداية (جنيه)</span>
          <input
            className={inp}
            name="baseFare"
            type="number"
            min="0"
            defaultValue={c ? piastresToEgp(c.baseFare) : ""}
            placeholder="70"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>سعر الكيلومتر (جنيه)</span>
          <input
            className={inp}
            name="perKm"
            type="number"
            min="0"
            step="0.5"
            defaultValue={c ? piastresToEgp(c.perKm) : ""}
            placeholder="6"
          />
        </label>
      </Section>

      <Section
        title="إعدادات"
        note="«الحجم» هو اللي العميل بيختار بيه في شاشة الطلب — خلي كل نوع بحجم مختلف."
      >
        <label className="flex flex-col gap-1">
          <span className={lbl}>الحجم</span>
          <select className={inp} name="sizeCode" defaultValue={c?.sizeCode ?? ""}>
            <option value="">— مش ظاهر في الطلب —</option>
            <option value="XS">XS</option>
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>الفئة</span>
          <select className={inp} name="kind" defaultValue={c?.kind ?? "pickup"}>
            <option value="pickup">بيك أب</option>
            <option value="van">فان</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={lbl}>الترتيب (الأصغر الأول)</span>
          <input
            className={inp}
            name="sort"
            type="number"
            min="0"
            defaultValue={c?.sort ?? ""}
            placeholder="1"
          />
        </label>
        <label className="flex items-center gap-2 col-span-2 sm:col-span-3 font-bold text-sm cursor-pointer">
          <input
            type="checkbox"
            name="active"
            defaultChecked={c ? c.active : true}
            className="w-5 h-5 accent-[var(--color-primary)]"
          />
          يظهر للعملاء
        </label>
      </Section>
    </div>
  );
}

export interface CategoryUsage {
  vehicles: number;
  orders: number;
}

/** One type's page: create (no `c`) or view / edit an existing type. */
export function CategoryForm({ c, use }: { c?: CategoryDTO; use?: CategoryUsage }) {
  const [state, action] = useActionState<ActionResult, FormData>(saveCategory, { ok: false });
  const router = useRouter();
  const used = !!use && use.vehicles + use.orders > 0;
  useEffect(() => {
    if (state.ok && !c) router.push("/admin/categories");
  }, [state, c, router]);

  return (
    <form action={action} className="bg-panel border border-line rounded-card p-4 md:p-5 flex flex-col gap-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      {c && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {c.active ? (
            <span className="rounded-full bg-ok-soft text-ok px-2.5 py-0.5 text-xs font-bold">
              ظاهر للعملاء
            </span>
          ) : (
            <span className="rounded-full bg-off-soft text-off px-2.5 py-0.5 text-xs font-bold">
              مخفي عن العملاء
            </span>
          )}
          {use && (
            <span className="text-muted">
              {use.vehicles} عربية في الأسطول · {use.orders} طلب
            </span>
          )}
          {use && use.vehicles > 0 && (
            <Link href="/admin/fleet" className="text-primary font-bold">
              عرض العربيات ›
            </Link>
          )}
        </div>
      )}
      {state.error && (
        <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">
          {state.error}
        </div>
      )}
      {state.ok && c && (
        <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-semibold">اتحفظ</div>
      )}
      <Fields c={c} />
      {state.error && (
        <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-semibold">
          {state.error}
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
        <SaveBtn label={c ? "حفظ التعديلات" : "إضافة النوع"} />
        <Link
          href="/admin/categories"
          className="rounded-xl px-4 py-2.5 font-bold text-ink-2 border border-line-2 hover:bg-panel-2"
        >
          رجوع
        </Link>
        {c && (
          <button
            formAction={toggleCategoryActive}
            className="rounded-xl px-4 py-2.5 font-bold text-ink-2 border border-line-2 hover:bg-panel-2"
          >
            {c.active ? "إخفاء عن العملاء" : "إظهار للعملاء"}
          </button>
        )}
        {c && !used && (
          <button
            formAction={deleteCategoryAction}
            onClick={(e) => {
              if (!confirm(`تمسح «${c.name}» نهائياً؟`)) e.preventDefault();
            }}
            className="rounded-xl px-4 py-2.5 font-bold text-booked border border-booked-soft hover:bg-booked-soft ms-auto"
          >
            حذف
          </button>
        )}
      </div>
      {c && used && (
        <p className="text-xs text-muted">النوع ده عليه عربيات أو طلبات، فمينفعش يتحذف — اخفيه بدل الحذف.</p>
      )}
    </form>
  );
}

function SaveBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-xl px-5 py-2.5 font-bold bg-primary text-white disabled:opacity-50"
    >
      {pending ? "…" : label}
    </button>
  );
}
