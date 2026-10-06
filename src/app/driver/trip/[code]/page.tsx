import Link from "next/link";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { labelDateArabic, labelTime } from "@/lib/time";
import { Icon, type IconName } from "@/components/Icons";
import { TripMap } from "@/components/driver/TripMap";
import { OrderActions } from "@/components/driver/OrderActions";
import { Card, ContactButtons, DriverNotice, RoutePoint, ScreenHead, StepBar, TripStats, pointUrl, routeUrl } from "@/components/driver/parts";
import type { DeliveryOrderDTO } from "@/data/types";

export const dynamic = "force-dynamic";

export default async function DriverTripPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await getSession();
  const driver = session ? await repo.getStaffByPhone(session.phone) : null;

  if (!driver || driver.role !== "driver") {
    return (
      <DriverNotice icon="lock" title="الصفحة دي للسواقين بس">
        <Link href="/login?next=/driver" className="tap rounded-2xl bg-primary text-white font-bold grid place-items-center">الدخول</Link>
      </DriverNotice>
    );
  }

  const o = await repo.getDeliveryOrder(code);
  if (!o || o.driverId !== driver.id) {
    return (
      <DriverNotice icon="search" title="التوصيلة دي مش موجودة أو مش ليك">
        <Link href="/driver" className="tap rounded-2xl bg-primary text-white font-bold grid place-items-center">رجوع لشغلي</Link>
      </DriverNotice>
    );
  }

  if (o.status === "completed") return <Delivered o={o} />;
  if (o.status === "cancelled") {
    return (
      <DriverNotice icon="xCircle" title="التوصيلة دي اتلغت">
        <p className="text-muted">لو عندك سؤال كلّم الإدارة.</p>
        <Link href="/driver" className="tap rounded-2xl bg-primary text-white font-bold grid place-items-center">رجوع لشغلي</Link>
      </DriverNotice>
    );
  }
  if (o.status === "en_route" || o.status === "arrived") return <OnTheWay o={o} />;
  return <Details o={o} />;
}

/* ---------- 1) before starting: details + map ---------- */
function Details({ o }: { o: DeliveryOrderDTO }) {
  const pickup = o.pickupLat != null && o.pickupLng != null ? { lat: o.pickupLat, lng: o.pickupLng } : null;
  const dropoff = o.dropoffLat != null && o.dropoffLng != null ? { lat: o.dropoffLat, lng: o.dropoffLng } : null;
  const route = routeUrl(o);
  return (
    <div className="p-4 flex flex-col gap-4">
      <ScreenHead title="تفاصيل التوصيلة" />

      <div className="flex items-center justify-between bg-panel border border-line rounded-card px-4 py-3">
        <span className="flex items-center gap-2 text-3xl font-extrabold text-emph">
          <Icon name="clock" className="w-7 h-7" strokeWidth={2.2} />
          {labelTime(o.scheduledAt)}
        </span>
        <span className="text-ink-2 text-left">
          {labelDateArabic(o.scheduledAt)}
          <span className="block text-sm text-muted" dir="ltr">#{o.code}</span>
        </span>
      </div>

      {/* map with the two ends labelled on top */}
      <div className="relative">
        <TripMap pickup={pickup} dropoff={dropoff} />
        <MapLabel className="top-3 right-3" kind="pickup" text={o.pickupAddress} />
        <MapLabel className="bottom-3 left-3" kind="dropoff" text={o.dropoffAddress} />
      </div>

      <Card className="p-4">
        <TripStats o={o} />
      </Card>

      <Card className="p-4 flex flex-col gap-4">
        <RoutePoint kind="pickup" address={o.pickupAddress} details={o.pickupDetails} />
        <RoutePoint kind="dropoff" address={o.dropoffAddress} details={o.dropoffDetails} />
      </Card>

      <CustomerCard o={o} />
      {o.notes && <NotesCard notes={o.notes} />}

      <OrderActions code={o.code} status={o.status} />
      {route && (
        <a
          href={route}
          target="_blank"
          rel="noopener noreferrer"
          className="tap rounded-2xl border-2 border-primary text-primary text-lg font-extrabold flex items-center justify-center gap-2 hover:bg-primary-soft"
        >
          <Icon name="map" className="w-5 h-5" /> افتح الطريق في خرائط جوجل
        </a>
      )}
    </div>
  );
}

function MapLabel({ kind, text, className }: { kind: "pickup" | "dropoff"; text: string | null; className: string }) {
  return (
    <div className={`absolute z-[500] max-w-[60%] bg-panel/95 rounded-2xl shadow-md px-3 py-2 flex items-center gap-2 ${className}`}>
      <Icon name={kind === "pickup" ? "mapPin" : "flag"} className={`w-5 h-5 shrink-0 ${kind === "pickup" ? "text-booked" : "text-primary"}`} />
      <span className="min-w-0">
        <span className="block text-[11px] text-muted">{kind === "pickup" ? "موقع الاستلام" : "موقع التسليم"}</span>
        <span className="block font-extrabold truncate">{text || "على الخريطة"}</span>
      </span>
    </div>
  );
}

/* ---------- 2) on the road: to pickup (en_route) then to drop-off (arrived) ---------- */
function OnTheWay({ o }: { o: DeliveryOrderDTO }) {
  const toPickup = o.status === "en_route";
  const target = toPickup
    ? { kind: "pickup" as const, address: o.pickupAddress, details: o.pickupDetails, url: pointUrl(o.pickupLat, o.pickupLng, o.pickupAddress) }
    : { kind: "dropoff" as const, address: o.dropoffAddress, details: o.dropoffDetails, url: pointUrl(o.dropoffLat, o.dropoffLng, o.dropoffAddress) };

  return (
    <div className="p-4 flex flex-col gap-4">
      <ScreenHead title={toPickup ? "أنا في الطريق" : "في الطريق للتسليم"} />
      <StepBar status={o.status} />

      <div className="bg-primary-soft rounded-card px-4 py-3.5 flex items-center gap-3">
        <span className="w-11 h-11 shrink-0 rounded-full bg-panel text-primary grid place-items-center">
          <Icon name={toPickup ? "truck" : "box"} className="w-6 h-6" />
        </span>
        <div>
          <div className="font-extrabold text-lg text-primary-ink">
            {toPickup ? "أنت دلوقتي في الطريق لمكان الاستلام" : "استلمت الحمولة — اتجه لمكان التسليم"}
          </div>
          <div className="text-ink-2 text-sm">
            {toPickup ? "أول ما توصل دوس «تم الوصول لموقع الاستلام»" : "بعد ما تسلّم الحاجة دوس «تم التوصيل»"}
          </div>
        </div>
      </div>

      <Card className="p-4 flex flex-col gap-4">
        <RoutePoint kind={target.kind} address={target.address} details={target.details} />
        <ContactButtons phone={o.contactPhone} />
        {target.url && (
          <a
            href={target.url}
            target="_blank"
            rel="noopener noreferrer"
            className="tap rounded-2xl bg-primary-soft text-primary-ink font-extrabold text-lg flex items-center justify-center gap-2"
          >
            <Icon name="map" className="w-5 h-5" /> {toPickup ? "افتح الطريق لمكان الاستلام" : "افتح الطريق لمكان التسليم"}
          </a>
        )}
      </Card>

      <details className="group bg-panel border border-line rounded-card shadow-sm overflow-hidden" open={!toPickup || undefined}>
        <summary className="list-none cursor-pointer p-4 flex items-center justify-between font-extrabold text-lg">
          <span className="flex items-center gap-2">
            <Icon name="file" className="w-6 h-6 text-ink-2" /> معلومات الطلب
          </span>
          <Icon name="chevronDown" className="w-5 h-5 text-muted group-open:rotate-180 transition-transform" />
        </summary>
        <div className="px-4 pb-4 flex flex-col divide-y divide-line">
          <InfoRow icon="truck" k="العربية" v={`${o.sizeName}${o.sizeCode ? ` · ${o.sizeCode}` : ""}`} />
          {o.cargoType && <InfoRow icon="box" k="نوع الحمولة" v={o.cargoType} />}
          <InfoRow icon="map" k="المسافة الإجمالية" v={`${o.km} كم`} />
          <InfoRow icon="users" k="عدد العمالة" v={o.loaders === 0 ? "مفيش" : o.loaders === 1 ? "عامل واحد" : `${o.loaders} عمال`} />
          <InfoRow icon={toPickup ? "flag" : "mapPin"} k={toPickup ? "التسليم في" : "الاستلام كان من"} v={(toPickup ? o.dropoffAddress : o.pickupAddress) || "على الخريطة"} />
          {o.notes && <InfoRow icon="file" k="ملاحظات العميل" v={o.notes} />}
        </div>
      </details>

      <OrderActions code={o.code} status={o.status} />
    </div>
  );
}

function InfoRow({ icon, k, v }: { icon: IconName; k: string; v: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Icon name={icon} className="w-5 h-5 text-muted shrink-0" />
      <span className="text-ink-2 shrink-0">{k}</span>
      <span className="mr-auto font-bold text-left">{v}</span>
    </div>
  );
}

/* ---------- 3) done ---------- */
function Delivered({ o }: { o: DeliveryOrderDTO }) {
  return (
    <div className="p-4 flex flex-col gap-5">
      <ScreenHead title="تم التوصيل" />
      <StepBar status="completed" />

      <div className="flex flex-col items-center text-center gap-2 pt-2">
        <span className="relative w-32 h-32 rounded-full bg-[#fcefd9] grid place-items-center">
          <Icon name="box" className="w-16 h-16 text-[#b5813f]" strokeWidth={1.6} />
          <span className="absolute -top-1 -left-1 w-12 h-12 rounded-full bg-primary text-white grid place-items-center border-4 border-ground">
            <Icon name="check" className="w-6 h-6" strokeWidth={3.2} />
          </span>
        </span>
        <h2 className="text-3xl font-extrabold mt-2">تم التوصيل بنجاح</h2>
        <p className="text-muted text-lg">شكراً ليك، التوصيلة خلصت</p>
        <span className="rounded-full bg-panel-2 px-4 py-1.5 font-bold">
          رقم الطلب: <span dir="ltr">#{o.code}</span>
        </span>
      </div>

      <Card className="p-4">
        <h3 className="font-extrabold text-lg mb-1">ملخص التوصيلة</h3>
        <div className="flex flex-col divide-y divide-line">
          <InfoRow icon="calendar" k="التاريخ" v={labelDateArabic(o.scheduledAt)} />
          <InfoRow icon="clock" k="الميعاد" v={labelTime(o.scheduledAt)} />
          <InfoRow icon="mapPin" k="من" v={o.pickupAddress || "على الخريطة"} />
          <InfoRow icon="flag" k="إلى" v={o.dropoffAddress || "على الخريطة"} />
          <InfoRow icon="map" k="المسافة" v={`${o.km} كم`} />
        </div>
      </Card>

      <Link href="/driver" className="tap rounded-2xl bg-primary text-white text-xl font-extrabold flex items-center justify-center gap-2">
        العودة إلى شغلي <Icon name="chevronLeft" className="w-6 h-6" strokeWidth={2.6} />
      </Link>
    </div>
  );
}

function CustomerCard({ o }: { o: DeliveryOrderDTO }) {
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-primary-soft text-primary grid place-items-center">
          <Icon name="user" className="w-6 h-6" />
        </span>
        <div>
          <div className="text-sm text-muted">معلومات العميل</div>
          <div className="text-lg font-extrabold">{o.contactName ?? "العميل"}</div>
        </div>
      </div>
      <ContactButtons phone={o.contactPhone} />
    </Card>
  );
}

function NotesCard({ notes }: { notes: string }) {
  return (
    <Card className="p-4 bg-accent-soft/50 flex gap-3">
      <Icon name="file" className="w-6 h-6 text-ink-2 shrink-0 mt-0.5" />
      <div>
        <div className="font-extrabold">ملاحظات مهمة</div>
        <p className="text-ink-2 mt-0.5 leading-relaxed">{notes}</p>
      </div>
    </Card>
  );
}
