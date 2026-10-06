import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icons";
import type { DeliveryOrderDTO, DeliveryOrderStatus } from "@/data/types";

/** Driver-facing status pill text. */
export const DRIVER_STATUS: Partial<Record<DeliveryOrderStatus, { label: string; cls: string }>> = {
  assigned: { label: "تم التعيين لك", cls: "bg-reserved-soft text-reserved" },
  en_route: { label: "في الطريق للاستلام", cls: "bg-rented-soft text-rented" },
  arrived: { label: "في الطريق للتسليم", cls: "bg-rented-soft text-rented" },
  completed: { label: "تم التوصيل", cls: "bg-ok-soft text-ok" },
  cancelled: { label: "ملغية", cls: "bg-booked-soft text-booked" },
};

export function StatusPill({ status }: { status: DeliveryOrderStatus }) {
  const s = DRIVER_STATUS[status];
  if (!s) return null;
  return <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${s.cls}`}>{s.label}</span>;
}

/** One end of the trip: red pin (pickup) or teal flag (drop-off). */
export function RoutePoint({ kind, address, details }: { kind: "pickup" | "dropoff"; address: string | null; details?: string | null }) {
  const pickup = kind === "pickup";
  return (
    <div className="flex items-start gap-3">
      <span className={`w-12 h-12 shrink-0 rounded-full grid place-items-center ${pickup ? "bg-booked-soft text-booked" : "bg-primary-soft text-primary"}`}>
        <Icon name={pickup ? "mapPin" : "flag"} className="w-6 h-6" />
      </span>
      <div className="min-w-0 pt-0.5">
        <div className="text-sm text-muted">{pickup ? "موقع الاستلام" : "موقع التسليم"}</div>
        <div className="text-xl font-extrabold leading-snug">{address || "على الخريطة"}</div>
        {details && <div className="text-ink-2 mt-0.5">{details}</div>}
      </div>
    </div>
  );
}

/** Pickup → drop-off with a dotted connector. */
export function Route({ o }: { o: DeliveryOrderDTO }) {
  return (
    <div className="relative flex flex-col gap-4">
      <span className="absolute right-6 top-12 h-[calc(100%-6rem)] border-r-2 border-dotted border-primary/50" aria-hidden />
      <RoutePoint kind="pickup" address={o.pickupAddress} details={o.pickupDetails} />
      <RoutePoint kind="dropoff" address={o.dropoffAddress} details={o.dropoffDetails} />
    </div>
  );
}

/** Distance · cargo · loaders. */
export function TripStats({ o }: { o: DeliveryOrderDTO }) {
  const items: { icon: IconName; value: string; label: string }[] = [
    { icon: "map", value: `${o.km} كم`, label: "المسافة" },
    { icon: "box", value: o.cargoType || o.sizeName, label: o.cargoType ? "نوع الحمولة" : "العربية" },
    { icon: "users", value: o.loaders === 0 ? "مفيش" : o.loaders === 1 ? "عامل واحد" : `${o.loaders} عمال`, label: "العمالة" },
  ];
  return (
    <div className="grid grid-cols-3 divide-x divide-x-reverse divide-line">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col items-center gap-1 text-center px-1">
          <Icon name={it.icon} className="w-6 h-6 text-ink-2" />
          <span className="font-extrabold leading-tight">{it.value}</span>
          <span className="text-xs text-muted">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Big call / WhatsApp buttons for a phone number. */
export function ContactButtons({ phone }: { phone: string | null }) {
  if (!phone) return null;
  const wa = phone.replace(/[^0-9]/g, "");
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <a href={`tel:${phone}`} className="tap rounded-2xl border-2 border-primary text-primary font-extrabold text-lg flex items-center justify-center gap-2 hover:bg-primary-soft">
        <Icon name="phone" className="w-5 h-5" /> اتصال
      </a>
      <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="tap rounded-2xl border-2 border-primary text-primary font-extrabold text-lg flex items-center justify-center gap-2 hover:bg-primary-soft">
        <Icon name="whatsapp" className="w-5 h-5" /> واتساب
      </a>
    </div>
  );
}

const STEPS = [
  { label: "تم التعيين", status: "assigned" },
  { label: "في الطريق", status: "en_route" },
  { label: "تم الوصول", status: "arrived" },
  { label: "تم التسليم", status: "completed" },
] as const;

/** 4-step driver progress: done = check, current = filled truck, upcoming = grey. */
export function StepBar({ status }: { status: DeliveryOrderStatus }) {
  const cur = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="grid grid-cols-4 relative">
      <span className="absolute top-6 right-[12.5%] left-[12.5%] h-1 rounded-full bg-line-2" aria-hidden />
      <span
        className="absolute top-6 right-[12.5%] h-1 rounded-full bg-primary"
        style={{ width: `${(Math.max(cur, 0) / (STEPS.length - 1)) * 75}%` }}
        aria-hidden
      />
      {STEPS.map((s, i) => {
        const done = i < cur || (i === cur && s.status === "completed");
        const isCur = i === cur && !done;
        return (
          <li key={s.status} className="relative flex flex-col items-center gap-1.5">
            <span
              className={`w-12 h-12 rounded-full grid place-items-center border-2 ${
                done
                  ? "bg-primary border-primary text-white"
                  : isCur
                    ? "bg-primary border-primary text-white shadow-[0_0_0_5px_var(--color-primary-soft)]"
                    : "bg-panel border-line-2 text-muted"
              }`}
            >
              <Icon name={done ? "check" : "truck"} className="w-6 h-6" strokeWidth={done ? 3 : 2} />
            </span>
            <span className={`text-sm ${isCur || done ? "font-extrabold text-primary" : "text-muted font-semibold"}`}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Title row for inner driver screens. */
export function ScreenHead({ title, back = "/driver" }: { title: string; back?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Link href={back} aria-label="رجوع" className="w-11 h-11 -mr-2 grid place-items-center rounded-full hover:bg-panel-2">
        <Icon name="chevronLeft" className="w-6 h-6 rotate-180" strokeWidth={2.4} />
      </Link>
      <h1 className="text-2xl font-extrabold">{title}</h1>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`bg-panel border border-line rounded-card shadow-sm ${className}`}>{children}</section>;
}

/** Full-screen notice (not logged in, not a driver, not found). */
export function DriverNotice({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="p-6 min-h-[60vh] flex flex-col items-center justify-center text-center gap-3">
      <span className="w-20 h-20 rounded-full bg-primary-soft text-primary grid place-items-center">
        <Icon name={icon} className="w-10 h-10" />
      </span>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      {children && <div className="flex flex-col gap-3 w-full max-w-xs">{children}</div>}
    </div>
  );
}

/** Google Maps: full route, or directions to one point (falls back to an address search). */
export function routeUrl(o: DeliveryOrderDTO): string | null {
  if (o.pickupLat == null || o.pickupLng == null || o.dropoffLat == null || o.dropoffLng == null) return null;
  return `https://www.google.com/maps/dir/?api=1&origin=${o.pickupLat},${o.pickupLng}&destination=${o.dropoffLat},${o.dropoffLng}`;
}
export function pointUrl(lat: number | null, lng: number | null, address: string | null): string | null {
  if (lat != null && lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
}
