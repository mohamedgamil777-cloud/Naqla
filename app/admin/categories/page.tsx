import Link from "next/link";
import { categoryUsage, listCategories } from "@/db/lib/categories";
import { VehicleImage } from "@/components/VehicleImage";
import { Icon } from "@/components/Icons";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

/** Admin → الأنواع: one box per type; a box opens that type's page. */
export default async function AdminCategories() {
  await requirePermission("category:manage");
  const [categories, usage] = await Promise.all([listCategories(), categoryUsage()]);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">أنواع العربيات</h1>
          <p className="text-muted text-sm">{categories.length} نوع · اضغط على أي نوع لتفاصيله</p>
        </div>
        <Link
          href="/admin/categories/new"
          className="rounded-2xl px-5 py-3 font-bold bg-primary text-white flex items-center gap-2 shrink-0"
        >
          <span className="text-xl leading-none">+</span> نوع جديد
        </Link>
      </div>

      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((c) => {
          const use = usage[c.id] ?? { vehicles: 0, orders: 0 };
          return (
            <li key={c.id}>
              <Link
                href={`/admin/categories/${c.id}`}
                className={`group h-full flex flex-col bg-panel border border-line rounded-card overflow-hidden hover:border-primary hover:shadow-md transition ${c.active ? "" : "opacity-60"}`}
              >
                <div className="relative aspect-[16/10] bg-gradient-to-b from-primary-soft to-[#f3f6f4]">
                  {c.image ? (
                    <VehicleImage src={c.image} alt={c.name} sizes="300px" />
                  ) : (
                    <div className="grid place-items-center h-full">
                      <Icon
                        name={c.kind === "van" ? "van" : "truck"}
                        className="w-12 h-12 text-primary/70"
                        strokeWidth={2.5}
                      />
                    </div>
                  )}
                  {c.sizeCode && (
                    <span
                      className="absolute top-2 start-2 w-7 h-7 grid place-items-center rounded-full bg-panel shadow-sm text-xs font-extrabold"
                      dir="ltr"
                    >
                      {c.sizeCode}
                    </span>
                  )}
                  {!c.active && (
                    <span className="absolute top-2 end-2 rounded-full bg-off-soft text-off px-2 py-0.5 text-[11px] font-bold">
                      مخفي
                    </span>
                  )}
                </div>
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <div className="font-extrabold text-lg leading-snug">{c.name}</div>
                  <div className="text-sm text-muted">
                    {c.capacityKg ? `حتى ${c.capacityKg.toLocaleString("en-US")} كجم` : "الحمولة مش متسجلة"}
                  </div>
                  <div className="mt-auto pt-2 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 text-ink-2 font-bold">
                      <Icon name="truck" className="w-3.5 h-3.5" /> {use.vehicles} عربية
                    </span>
                    <span className="text-primary font-bold group-hover:underline">التفاصيل ›</span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/admin/categories/new"
            className="h-full min-h-48 flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line-2 text-primary font-bold hover:bg-primary-soft"
          >
            <span className="text-3xl leading-none">+</span>
            نوع جديد
          </Link>
        </li>
      </ul>
    </div>
  );
}
