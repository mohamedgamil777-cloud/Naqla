import type { Metadata } from "next";
import Link from "next/link";
import { listCategories } from "@/db/lib/categories";
import { VehicleImage } from "@/components/VehicleImage";
import { Icon, type IconName } from "@/components/Icons";
import { BODY_TYPE_LABEL } from "@/lib/constants";
import type { CategoryDTO } from "@/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "عربياتنا | انقلي" };

/** Customer page: every vehicle type انقلي works with, with what admin wrote in «الأنواع». */
export default async function CarsPage() {
  const types = (await listCategories()).filter((c) => c.active).sort((a, b) => a.sort - b.sort);
  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl md:text-[2rem] font-extrabold">عربياتنا</h1>
        <p className="text-muted mt-1">أنواع العربيات اللي بنشتغل بيها، وكل واحدة تشيل قد إيه.</p>
      </div>
      {types.length === 0 ? (
        <p className="text-muted">مفيش عربيات معروضة دلوقتي.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.map((c) => (
            <TypeCard key={c.id} c={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TypeCard({ c }: { c: CategoryDTO }) {
  const facts: { icon: IconName; label: string; value: string }[] = [];
  if (c.capacityKg)
    facts.push({ icon: "weight", label: "أقصى حمولة", value: `${c.capacityKg.toLocaleString("en-US")} كجم` });
  if (c.dims) facts.push({ icon: "box", label: "مقاس الصندوق", value: c.dims });
  if (c.volumeM3) facts.push({ icon: "box", label: "حجم الصندوق", value: `${c.volumeM3} م³` });
  if (c.bodyType)
    facts.push({
      icon: "truck",
      label: "شكل الصندوق",
      value: BODY_TYPE_LABEL[c.bodyType as keyof typeof BODY_TYPE_LABEL],
    });
  const fits = (c.features ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <li className="bg-panel border border-line rounded-card overflow-hidden flex flex-col">
      <div className="relative aspect-[16/9] bg-gradient-to-b from-primary-soft to-[#f3f6f4]">
        {c.image ? (
          <VehicleImage src={c.image} alt={c.name} sizes="(max-width:640px) 100vw, 360px" />
        ) : (
          <div className="grid place-items-center h-full">
            <Icon
              name={c.kind === "van" ? "van" : "truck"}
              className="w-16 h-16 text-primary/70"
              strokeWidth={2.5}
            />
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <h2 className="text-lg font-extrabold">{c.name}</h2>
        {c.description && <p className="text-sm text-ink-2">{c.description}</p>}
        {facts.length > 0 && (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {facts.map((f) => (
              <div key={f.label} className="bg-panel-2 rounded-xl px-3 py-2">
                <dt className="text-muted text-xs flex items-center gap-1.5">
                  <Icon name={f.icon} className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                  {f.label}
                </dt>
                <dd className="font-bold mt-0.5" dir="auto">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {fits.length > 0 && (
          <div>
            <div className="text-xs font-bold text-ink-2 mb-1.5">بتشيل إيه؟</div>
            <ul className="flex flex-col gap-1 text-sm">
              {fits.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Icon name="check" className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
        {c.sizeCode && (
          <Link
            href={`/estimate?size=${c.sizeCode}`}
            className="mt-auto rounded-xl bg-primary text-white py-2.5 text-sm font-bold flex items-center justify-center gap-1.5"
          >
            اطلب العربية دي
            <Icon name="arrowLeft" className="w-4 h-4" strokeWidth={2.4} />
          </Link>
        )}
      </div>
    </li>
  );
}
