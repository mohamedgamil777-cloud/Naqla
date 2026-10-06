import Link from "next/link";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { formatEgp } from "@/lib/money";
import { labelDateArabic, labelTime } from "@/lib/time";
import { EmptyState, LinkButton } from "@/components/ui";
import { RateOrder } from "@/components/RateOrder";
import type { BookingDTO, DeliveryOrderDTO, DeliveryOrderStatus } from "@/data/types";

export const dynamic = "force-dynamic";

const STATUS_ORDER: Record<DeliveryOrderStatus, number> = {
  new: 0,
  confirmed: 1,
  assigned: 2,
  en_route: 3,
  completed: 4,
  cancelled: -1,
};
const STEPS: { label: string; at: number }[] = [
  { label: "استلمنا طلبك", at: 0 },
  { label: "تم تأكيد طلبك", at: 1 },
  { label: "جاري البحث عن سائق", at: 1 },
  { label: "تم تعيين سائق", at: 2 },
  { label: "السائق في الطريق", at: 3 },
  { label: "تم التوصيل", at: 4 },
];

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) {
    return (
      <EmptyState
        title="لسه مفيش طلبات"
        subtitle="سجّل دخولك برقم موبايلك عشان تشوف طلباتك"
        action={<LinkButton href="/login?next=/bookings">دخول برقم الموبايل</LinkButton>}
      />
    );
  }

  const [orders, bookings] = await Promise.all([
    repo.listDeliveryOrdersByPhone(session.phone),
    repo.listBookingsByPhone(session.phone),
  ]);

  if (orders.length === 0 && bookings.length === 0) {
    return (
      <EmptyState
        title="لسه مفيش طلبات"
        subtitle="اطلب أول توصيلة بسهولة"
        action={<LinkButton href="/estimate" variant="accent">اطلب توصيلة</LinkButton>}
      />
    );
  }

  const activeOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "completed");
  const pastOrders = orders.filter((o) => o.status === "completed" || o.status === "cancelled");

  return (
    <div className="p-4 flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold">طلباتي</h1>

      {activeOrders.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-extrabold text-lg text-ink-2">الطلبات الحالية</h2>
          {activeOrders.map((o) => <OrderCard key={o.code} o={o} />)}
        </section>
      )}

      {pastOrders.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-extrabold text-lg text-ink-2">الطلبات السابقة</h2>
          {pastOrders.map((o) => <OrderCard key={o.code} o={o} compact />)}
        </section>
      )}

      {bookings.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-extrabold text-lg text-ink-2">حجوزات الإيجار</h2>
          {bookings.map((b) => <RentalRow key={b.code} b={b} />)}
        </section>
      )}
    </div>
  );
}

function OrderCard({ o, compact }: { o: DeliveryOrderDTO; compact?: boolean }) {
  const phone = o.contactPhone ?? "";
  if (o.status === "cancelled") {
    return (
      <div className="bg-panel border border-line rounded-card p-4 opacity-80">
        <div className="flex items-center justify-between">
          <span className="font-bold">طلب #{o.code} — {o.sizeName}</span>
          <span className="rounded-full bg-booked-soft text-booked px-3 py-1 text-xs font-bold">ملغي</span>
        </div>
        <div className="text-sm text-muted mt-1">{o.pickupAddress || "من الخريطة"} ← {o.dropoffAddress || "للخريطة"}</div>
      </div>
    );
  }

  const cur = STATUS_ORDER[o.status];

  return (
    <div className="bg-panel border border-line rounded-card p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-extrabold text-lg flex items-center gap-2">
            <span aria-hidden>📦</span> {o.sizeName}{o.sizeCode ? ` · ${o.sizeCode}` : ""}
          </div>
          <div className="text-muted text-sm mt-0.5">طلب #{o.code}</div>
        </div>
        <span className="font-extrabold text-emph">{formatEgp(o.priceSnapshot.total)}</span>
      </div>

      <div className="text-[15px] text-ink-2">
        <div>📍 {o.pickupAddress || "على الخريطة"}</div>
        <div>🏁 {o.dropoffAddress || "على الخريطة"}</div>
        <div className="text-sm text-muted mt-1">🗓️ {labelDateArabic(o.scheduledAt)} — {labelTime(o.scheduledAt)}</div>
      </div>

      {!compact && <Tracker cur={cur} />}

      {o.status === "assigned" && o.driverName && (
        <div className="bg-reserved-soft text-reserved rounded-xl px-3 py-2 text-sm font-bold">
          🧑‍✈️ تم تعيين السواق: {o.driverName} — هيكون في الطريق في الميعاد
        </div>
      )}
      {o.status === "en_route" && o.driverName && (
        <div className="bg-ok-soft text-ok rounded-xl px-3 py-2 text-sm font-bold">
          🚚 السواق {o.driverName} في الطريق إليك دلوقتي
        </div>
      )}
      {compact && (
        <span className={`self-start rounded-full px-3 py-1 text-xs font-bold ${o.status === "completed" ? "bg-ok-soft text-ok" : "bg-off-soft text-off"}`}>
          {o.status === "completed" ? "تم التوصيل" : "منتهي"}
        </span>
      )}
      {o.status === "completed" && (
        o.rating != null ? (
          <div className="text-sm font-bold" dir="ltr">{"⭐".repeat(o.rating)}<span className="text-muted">{"⭐".repeat(5 - o.rating)}</span></div>
        ) : (
          <RateOrder code={o.code} />
        )
      )}
      {phone && o.status !== "completed" && (
        <a href="/help" className="text-sm text-primary font-bold text-center">محتاج مساعدة في الطلب؟</a>
      )}
    </div>
  );
}

function Tracker({ cur }: { cur: number }) {
  return (
    <div className="flex items-center gap-1 pt-1">
      {STEPS.map((s, i) => {
        const done = s.at <= cur;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-center">
              <div className={`h-1.5 flex-1 rounded-full ${done ? "bg-primary" : "bg-line-2"}`} />
            </div>
            <span className={`text-[10px] font-bold text-center leading-tight ${done ? "text-emph" : "text-muted"}`}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RentalRow({ b }: { b: BookingDTO }) {
  return (
    <Link href={`/bookings/${b.code}`} className="block bg-panel border border-line rounded-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-bold">{b.vehicleName} — #{b.code}</span>
        <span className="font-bold text-emph">{formatEgp(b.priceSnapshot.total)}</span>
      </div>
      <div className="text-sm text-muted mt-1">{labelDateArabic(b.startsAt)} — {labelTime(b.startsAt)}</div>
    </Link>
  );
}
