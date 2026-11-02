import Link from "next/link";
import { setDeliveryOrderStatus } from "@/actions/admin/delivery-orders";
import { PodView } from "@/components/PodView";
import { formatEgp } from "@/lib/money";
import { labelDateArabic, labelTime } from "@/lib/time";
import type { RatingStat } from "@/services/ratings";
import type { CategoryDTO, DeliveryOrderDTO, StaffDTO } from "@/types";
import { OrderCashForm } from "./OrderCashForm";
import { OrderDriverPanel } from "./OrderDriverPanel";
import { OrderSizeForm } from "./OrderSizeForm";
import { ORDER_STATUS, isOnTheRoad, isOpenOrder } from "./status";
import { Icon } from "@/components/Icons";

export type OrderCardProps = {
  order: DeliveryOrderDTO;
  companyName: string | null;
  /** false = the customer's number hasn't been confirmed by an agent yet */
  phoneVerified: boolean;
  canVerify: boolean;
  drivers: StaffDTO[];
  ratings: Record<string, RatingStat>;
  sizes: CategoryDTO[];
};

function directionsUrl(o: DeliveryOrderDTO): string | null {
  if (o.pickupLat == null || o.dropoffLat == null) return null;
  return `https://www.google.com/maps/dir/?api=1&origin=${o.pickupLat},${o.pickupLng}&destination=${o.dropoffLat},${o.dropoffLng}`;
}

const place = (address: string | null, details: string | null) =>
  [address || "على الخريطة", details].filter(Boolean).join(" — ");

export function OrderCard(props: OrderCardProps) {
  const { order: o } = props;
  const isCompleted = o.status === "completed";
  const showUnverified = !!o.contactPhone && o.source !== "agent" && !props.phoneVerified;

  return (
    <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
      <OrderCardHeader order={o} companyName={props.companyName} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[15px]">
        <Row k="الميعاد" v={`${labelDateArabic(o.scheduledAt)} — ${labelTime(o.scheduledAt)}`} />
        <Row k="المسافة" v={`${o.km} كم`} />
        <Row k="الاستلام" v={place(o.pickupAddress, o.pickupDetails)} />
        <Row k="التسليم" v={place(o.dropoffAddress, o.dropoffDetails)} />
        {o.cargoType && <Row k="نوع الحمولة" v={o.cargoType} />}
        {o.loaders > 0 && <Row k="العمالة" v={`${o.loaders} أفراد`} />}
        <Row k="العميل" v={o.contactName ?? "-"} />
        <Row k="الموبايل" v={o.contactPhone ?? "-"} ltr />
        {showUnverified && <UnverifiedPhone phone={o.contactPhone!} canVerify={props.canVerify} />}
        {o.notes && <Row k="ملاحظات العميل" v={o.notes} />}
        {o.rating != null && <Row k="تقييم العميل" v={ratingText(o.rating, o.ratingComment)} />}
      </div>

      {isCompleted && <PodView o={o} />}
      {isCompleted && o.billing === "cash" && <OrderCashForm order={o} />}
      {isOpenOrder(o.status) && <OrderSizeForm order={o} sizes={props.sizes} />}
      <OrderDriverPanel order={o} drivers={props.drivers} ratings={props.ratings} />
      <OrderCardActions order={o} />
    </div>
  );
}

function ratingText(rating: number, comment: string | null) {
  return `${"⭐".repeat(rating)}${comment ? ` — ${comment}` : ""}`;
}

function OrderCardHeader({ order: o, companyName }: { order: DeliveryOrderDTO; companyName: string | null }) {
  const status = ORDER_STATUS[o.status];
  const size = `${o.sizeName}${o.sizeCode ? ` · ${o.sizeCode}` : ""}`;

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="font-extrabold text-lg">#{o.code}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.cls}`}>{status.label}</span>
        <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-bold">{size}</span>
        {o.companyId && (
          <Link
            href={`/admin/companies/${o.companyId}`}
            className="rounded-full bg-primary-soft text-primary-ink px-2 py-0.5 text-xs font-bold"
          >
            <Icon name="building" className="w-4 h-4 inline-block align-[-3px] me-1.5" />{companyName ?? "شركة"} · {o.billing === "account" ? "على الحساب" : "كاش"}
          </Link>
        )}
        {o.source === "agent" && (
          <span className="rounded-full bg-accent-soft text-accent-ink px-2 py-0.5 text-xs font-bold">
            <Icon name="phone" className="w-4 h-4 inline-block align-[-3px] me-1.5" />بالتليفون{o.agentName ? ` · ${o.agentName}` : ""}
          </span>
        )}
      </div>
      <span className="font-extrabold text-xl text-emph">{formatEgp(o.priceSnapshot.total)}</span>
    </div>
  );
}

function UnverifiedPhone({ phone, canVerify }: { phone: string; canVerify: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-reserved-soft text-reserved rounded-xl px-3 py-2 text-sm font-bold">
      <span>رقم غير مؤكد — اتصل بالعميل وأكّده قبل تعيين السواق</span>
      {canVerify && (
        <Link
          href={`/admin/customers?q=${encodeURIComponent(phone)}`}
          className="underline whitespace-nowrap"
        >
          أكّد الرقم
        </Link>
      )}
    </div>
  );
}

function OrderCardActions({ order: o }: { order: DeliveryOrderDTO }) {
  const maps = directionsUrl(o);
  const cancellable = o.status === "confirmed" || isOnTheRoad(o.status);

  return (
    <div className="flex flex-wrap gap-2 items-center pt-1">
      {o.contactPhone && (
        <a href={`tel:${o.contactPhone}`} className="rounded-xl bg-ok text-white px-4 py-2 font-bold tap">
          <Icon name="phone" className="w-4 h-4 inline-block align-[-3px] me-1.5" />اتصل بالعميل
        </a>
      )}
      {maps && (
        <a
          href={maps}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border-2 border-line-2 text-primary px-4 py-2 font-bold tap"
        >
          <Icon name="map" className="w-4 h-4 inline-block align-[-3px] me-1.5" />الطريق
        </a>
      )}
      {o.status === "new" && (
        <form action={setDeliveryOrderStatus} className="contents">
          <input type="hidden" name="code" value={o.code} />
          <button
            name="status"
            value="confirmed"
            className="rounded-xl bg-primary text-white px-4 py-2 font-bold tap"
          >
            أكّد الطلب
          </button>
          <button
            name="status"
            value="cancelled"
            className="rounded-xl text-booked border border-booked-soft px-4 py-2 font-bold tap"
          >
            إلغاء
          </button>
        </form>
      )}
      {cancellable && (
        <form action={setDeliveryOrderStatus} className="contents">
          <input type="hidden" name="code" value={o.code} />
          <button
            name="status"
            value="cancelled"
            className="rounded-xl text-booked border border-booked-soft px-4 py-2 font-bold tap"
          >
            إلغاء الطلب
          </button>
        </form>
      )}
    </div>
  );
}

function Row({ k, v, ltr }: { k: string; v: string; ltr?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted">{k}</span>
      <span className="font-semibold text-end" dir={ltr ? "ltr" : undefined}>
        {v}
      </span>
    </div>
  );
}
