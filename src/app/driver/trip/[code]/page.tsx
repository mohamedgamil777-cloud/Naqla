import Link from "next/link";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { labelDateArabic, labelTime } from "@/lib/time";
import { TripMap } from "@/components/driver/TripMap";
import { OrderActions } from "@/components/driver/OrderActions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  new: "جديد",
  confirmed: "مؤكد",
  assigned: "متعيّن ليك",
  en_route: "في الطريق",
  completed: "اتسلّمت",
  cancelled: "ملغية",
};

export default async function DriverTripPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await getSession();
  const driver = session ? await repo.getStaffByPhone(session.phone) : null;

  if (!driver || driver.role !== "driver") {
    return <Notice emoji="🚫" title="الصفحة دي للسواقين بس" />;
  }

  const o = await repo.getDeliveryOrder(code);
  if (!o || o.driverId !== driver.id) {
    return <Notice emoji="🤷" title="الرحلة دي مش موجودة أو مش ليك" />;
  }

  const phone = o.contactPhone ?? "";
  const wa = phone.replace(/[^0-9]/g, "");
  const pickup = o.pickupLat != null && o.pickupLng != null ? { lat: o.pickupLat, lng: o.pickupLng } : null;
  const dropoff = o.dropoffLat != null && o.dropoffLng != null ? { lat: o.dropoffLat, lng: o.dropoffLng } : null;
  const route =
    pickup && dropoff
      ? `https://www.google.com/maps/dir/?api=1&origin=${pickup.lat},${pickup.lng}&destination=${dropoff.lat},${dropoff.lng}`
      : null;

  return (
    <div className="p-4 flex flex-col gap-4">
      <Link href="/driver" className="text-primary font-bold tap">→ رجوع للشغل</Link>

      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold">توصيلة #{o.code}</h1>
        <span className="rounded-full bg-primary-soft text-primary-ink px-3 py-1 text-sm font-bold">{STATUS_LABEL[o.status] ?? o.status}</span>
      </div>

      {/* Big time + size */}
      <div className="bg-panel border border-line rounded-card p-4 flex items-center justify-between">
        <div>
          <div className="text-3xl font-extrabold text-emph leading-none">{labelTime(o.scheduledAt)}</div>
          <div className="text-sm text-muted mt-1">{labelDateArabic(o.scheduledAt)}</div>
        </div>
        <span className="rounded-full bg-ink/10 px-3 py-1 font-bold">{o.sizeName}{o.sizeCode ? ` · ${o.sizeCode}` : ""}</span>
      </div>

      {/* Route map */}
      <TripMap pickup={pickup} dropoff={dropoff} />

      {/* From → To */}
      <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>📍</span>
          <div>
            <div className="text-xs font-bold text-ok">من (الاستلام)</div>
            <div className="font-bold">{o.pickupAddress || "على الخريطة"}</div>
          </div>
        </div>
        <div className="border-r-2 border-dashed border-line-2 h-4 mr-3" />
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>🏁</span>
          <div>
            <div className="text-xs font-bold text-booked">لـ (التسليم)</div>
            <div className="font-bold">{o.dropoffAddress || "على الخريطة"}</div>
          </div>
        </div>
        <div className="flex gap-4 text-sm text-ink-2 pt-1 border-t border-line">
          <span>🛣️ {o.km} كم</span>
          {o.loaders > 0 && <span>👷 عمالة {o.loaders}</span>}
        </div>
      </div>

      {route && (
        <a href={route} target="_blank" rel="noopener noreferrer" className="rounded-2xl bg-primary text-white py-4 text-center text-xl font-extrabold tap">
          🧭 افتح الخريطة وابدأ التوصيل
        </a>
      )}

      {/* Customer */}
      <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 font-bold"><span aria-hidden>👤</span> {o.contactName ?? "العميل"}</div>
        {phone && (
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${phone}`} className="rounded-2xl bg-ok text-white py-3 text-center text-lg font-extrabold tap">📞 اتصل</a>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="rounded-2xl bg-[#25D366] text-white py-3 text-center text-lg font-extrabold tap">💬 واتساب</a>
          </div>
        )}
      </div>

      <OrderActions code={o.code} status={o.status} />
    </div>
  );
}

function Notice({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="p-6 min-h-[60vh] flex flex-col items-center justify-center text-center gap-3">
      <div className="text-6xl">{emoji}</div>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <Link href="/driver" className="rounded-2xl bg-primary text-white px-6 py-3 font-bold tap">رجوع</Link>
    </div>
  );
}
