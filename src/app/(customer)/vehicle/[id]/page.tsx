import { VehicleImage } from "@/components/VehicleImage";
import { notFound } from "next/navigation";
import { repo } from "@/data/repo";
import { formatEgp } from "@/lib/money";
import { LinkButton, VehicleStatusBadge } from "@/components/ui";
import { durationLabel } from "@/lib/client-time";

export const dynamic = "force-dynamic";

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await repo.getVehicle(id);
  if (!v) notFound();

  const specs: { k: string; val: string }[] = [
    { k: "الماركة", val: `${v.brand ?? "-"} ${v.model ?? ""}`.trim() },
    { k: "سنة الصنع", val: v.year ? String(v.year) : "-" },
    { k: "الركاب", val: v.seats ? `${v.seats}` : "-" },
    { k: "الحمولة", val: v.cargoKg ? `${(v.cargoKg / 1000).toLocaleString("en")} طن` : "-" },
    { k: "ناقل الحركة", val: v.transmission === "automatic" ? "أوتوماتيك" : "عادي" },
    { k: "الوقود", val: v.fuel === "diesel" ? "سولار" : v.fuel === "gas" ? "غاز" : v.fuel === "electric" ? "كهرباء" : "بنزين" },
  ];

  const tiers = v.rule.tiers.slice().sort((a, b) => a.hours - b.hours);
  const bookable = v.status === "available";

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="relative aspect-[16/9] rounded-card overflow-hidden bg-panel-2">
        <VehicleImage src={v.primaryImage} alt={v.name} sizes="512px" priority />
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">{v.name}</h1>
          <p className="text-muted">{v.categoryName} · {v.branchName}</p>
        </div>
        <VehicleStatusBadge status={v.status} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {specs.map((s) => (
          <div key={s.k} className="bg-panel border border-line rounded-2xl px-4 py-3">
            <div className="text-sm text-muted">{s.k}</div>
            <div className="font-bold">{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bg-panel border border-line rounded-card p-4">
        <h2 className="font-extrabold text-lg mb-3">الأسعار</h2>
        <div className="flex flex-col gap-2">
          {tiers.map((t) => (
            <div key={t.hours} className="flex justify-between">
              <span className="text-ink-2">{durationLabel(t.hours)}</span>
              <span className="font-bold">{formatEgp(t.price)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-dashed border-line-2 pt-2 mt-1">
            <span className="text-ink-2">اليوم الكامل</span>
            <span className="font-bold">{formatEgp(v.rule.dailyPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-2">التأمين (مسترد)</span>
            <span className="font-bold">{formatEgp(v.rule.deposit)}</span>
          </div>
          {v.hasDriverOption && (
            <div className="flex justify-between">
              <span className="text-ink-2">السائق</span>
              <span className="font-bold">{formatEgp(v.rule.driverFeePerHour)} / ساعة</span>
            </div>
          )}
          {v.rule.loaderFeePerPerson > 0 && (
            <div className="flex justify-between">
              <span className="text-ink-2">العمالة</span>
              <span className="font-bold">{formatEgp(v.rule.loaderFeePerPerson)} / فرد</span>
            </div>
          )}
        </div>
      </div>

      {bookable ? (
        <LinkButton href={`/book?vehicle=${v.id}`} variant="accent" full>احجز الآن</LinkButton>
      ) : (
        <div className="bg-panel-2 rounded-2xl p-4 text-center text-muted font-semibold">العربية دي مش متاحة للحجز حالياً</div>
      )}
    </div>
  );
}
