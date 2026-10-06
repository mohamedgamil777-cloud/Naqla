import Link from "next/link";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { formatEgp } from "@/lib/money";
import { labelDateArabic, labelTime } from "@/lib/time";
import { EmptyState, LinkButton } from "@/components/ui";
import { RateOrder } from "@/components/RateOrder";
import { Icon, type IconName } from "@/components/Icons";
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

const STATUS_PILL: Record<DeliveryOrderStatus, { label: string; cls: string }> = {
  new: { label: "استلمنا طلبك", cls: "bg-reserved-soft text-reserved" },
  confirmed: { label: "تم التأكيد", cls: "bg-primary-soft text-primary-ink" },
  assigned: { label: "تم تعيين سائق", cls: "bg-primary-soft text-primary-ink" },
  en_route: { label: "في الطريق", cls: "bg-rented-soft text-rented" },
  completed: { label: "تم التوصيل", cls: "bg-ok-soft text-ok" },
  cancelled: { label: "ملغي", cls: "bg-booked-soft text-booked" },
};

/** `at` = the status index from which the step counts as reached. */
const STEPS: { label: string; at: number; icon: IconName }[] = [
  { label: "استلمنا طلبك", at: 0, icon: "file" },
  { label: "تم تأكيد طلبك", at: 1, icon: "checkCircle" },
  { label: "جاري البحث عن سائق", at: 1, icon: "search" },
  { label: "تم تعيين السائق", at: 2, icon: "user" },
  { label: "السائق في الطريق", at: 3, icon: "truck" },
  { label: "تم التوصيل", at: 4, icon: "flag" },
];

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) {
    return (
      <EmptyState
        title="تابع طلباتك من هنا"
        subtitle="سجّل دخولك برقم موبايلك عشان تشوف طلباتك وحالتها"
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
        subtitle="اطلب أول توصيلة وهتلاقيها هنا تتابعها خطوة بخطوة"
        action={<LinkButton href="/estimate" variant="accent">اطلب توصيلة</LinkButton>}
      />
    );
  }

  const activeOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "completed");
  const pastOrders = orders.filter((o) => o.status === "completed" || o.status === "cancelled");

  return (
    <div className="p-4 flex flex-col gap-6">
      <header>
        <h1 className="text-[1.7rem] font-extrabold leading-tight">طلباتي</h1>
        <p className="text-muted mt-1">تابع حالة توصيلاتك خطوة بخطوة</p>
      </header>

      {activeOrders.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle title="الطلبات الحالية" count={activeOrders.length} />
          {activeOrders.map((o) => (
            <ActiveOrder key={o.code} o={o} />
          ))}
        </section>
      )}

      {activeOrders.length === 0 && (
        <Link href="/estimate" className="tap bg-accent text-on-accent rounded-2xl font-extrabold text-lg flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(242,165,65,0.3)]">
          اطلب توصيلة جديدة <Icon name="chevronLeft" className="w-5 h-5" strokeWidth={2.6} />
        </Link>
      )}

      {pastOrders.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle title="الطلبات السابقة" count={pastOrders.length} />
          {pastOrders.map((o) => (
            <PastOrder key={o.code} o={o} />
          ))}
        </section>
      )}

      {bookings.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle title="حجوزات الإيجار" count={bookings.length} />
          {bookings.map((b) => (
            <RentalRow key={b.code} b={b} />
          ))}
        </section>
      )}
    </div>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="text-lg font-extrabold flex items-center gap-2">
      {title}
      <span className="rounded-full bg-panel-2 text-ink-2 text-xs font-bold px-2 py-0.5">{count}</span>
    </h2>
  );
}

function StatusPill({ status }: { status: DeliveryOrderStatus }) {
  const p = STATUS_PILL[status];
  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${p.cls}`}>{p.label}</span>;
}

/** From → to with the same pin/flag language as the order screen. */
function Route({ o }: { o: DeliveryOrderDTO }) {
  return (
    <div className="relative flex flex-col gap-2.5">
      <span className="absolute right-[0.95rem] top-8 bottom-8 border-r-2 border-dotted border-primary/40" aria-hidden />
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 shrink-0 rounded-full bg-booked-soft text-booked grid place-items-center">
          <Icon name="mapPin" className="w-4 h-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs text-muted">من</span>
          <span className="block font-semibold truncate">{o.pickupAddress || "على الخريطة"}</span>
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 shrink-0 rounded-full bg-primary-soft text-primary grid place-items-center">
          <Icon name="flag" className="w-4 h-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs text-muted">إلى</span>
          <span className="block font-semibold truncate">{o.dropoffAddress || "على الخريطة"}</span>
        </span>
      </div>
    </div>
  );
}

function Meta({ o }: { o: DeliveryOrderDTO }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="flex items-center gap-1.5 text-ink-2">
        <Icon name="calendar" className="w-4 h-4 text-muted" />
        {labelDateArabic(o.scheduledAt)} · {labelTime(o.scheduledAt)}
      </span>
      <span className="text-lg font-extrabold text-emph">{formatEgp(o.priceSnapshot.total)}</span>
    </div>
  );
}

function OrderHead({ o }: { o: DeliveryOrderDTO }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-11 h-11 shrink-0 rounded-xl bg-primary-soft text-primary grid place-items-center">
          <Icon name="truck" className="w-6 h-6" />
        </span>
        <div className="min-w-0">
          <div className="font-extrabold flex items-center gap-1.5">
            {o.sizeName}
            {o.sizeCode && <span className="rounded-full bg-panel-2 text-ink-2 text-[11px] px-2 py-0.5">{o.sizeCode}</span>}
          </div>
          <div className="text-muted text-sm" dir="ltr">#{o.code}</div>
        </div>
      </div>
      <StatusPill status={o.status} />
    </div>
  );
}

function ActiveOrder({ o }: { o: DeliveryOrderDTO }) {
  const cur = STATUS_ORDER[o.status];
  return (
    <article className="bg-panel border border-line rounded-card shadow-sm p-4 flex flex-col gap-4">
      <OrderHead o={o} />
      <Route o={o} />
      <Meta o={o} />

      {o.driverName && (o.status === "assigned" || o.status === "en_route") && (
        <div className={`rounded-2xl px-3.5 py-3 flex items-center gap-3 ${o.status === "en_route" ? "bg-ok-soft" : "bg-primary-soft"}`}>
          <span className="w-10 h-10 shrink-0 rounded-full bg-panel grid place-items-center text-primary">
            <Icon name="user" className="w-5 h-5" />
          </span>
          <div className="text-sm">
            <div className="font-extrabold">{o.driverName}</div>
            <div className="text-ink-2">{o.status === "en_route" ? "السائق في الطريق إليك دلوقتي" : "هيكون عندك في الميعاد"}</div>
          </div>
        </div>
      )}

      <Tracker cur={cur} />

      <Link href="/help" className="flex items-center justify-center gap-1.5 text-sm font-bold text-primary">
        <Icon name="help" className="w-4 h-4" /> محتاج مساعدة في الطلب؟
      </Link>
    </article>
  );
}

/** Vertical step list: done = teal check, current = filled teal, upcoming = grey. */
function Tracker({ cur }: { cur: number }) {
  // the current step is the last one already reached
  const currentIdx = STEPS.reduce((acc, s, i) => (s.at <= cur ? i : acc), 0);
  return (
    <ol className="bg-ground/60 rounded-2xl p-3.5 flex flex-col">
      {STEPS.map((s, i) => {
        const reached = i <= currentIdx;
        const isCur = i === currentIdx;
        const last = i === STEPS.length - 1;
        return (
          <li key={s.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`w-8 h-8 rounded-full grid place-items-center border-2 ${
                  isCur
                    ? "bg-primary border-primary text-white shadow-[0_0_0_4px_var(--color-primary-soft)]"
                    : reached
                      ? "bg-primary-soft border-primary text-primary"
                      : "bg-panel border-line-2 text-muted"
                }`}
              >
                {reached && !isCur ? <Icon name="check" className="w-4 h-4" strokeWidth={3} /> : <Icon name={s.icon} className="w-4 h-4" />}
              </span>
              {!last && <span className={`w-0.5 flex-1 min-h-4 ${i < currentIdx ? "bg-primary" : "bg-line-2"}`} />}
            </div>
            <span className={`pt-1 ${last ? "" : "pb-3"} ${isCur ? "font-extrabold text-emph" : reached ? "font-semibold text-ink-2" : "text-muted"}`}>
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function PastOrder({ o }: { o: DeliveryOrderDTO }) {
  return (
    <article className={`bg-panel border border-line rounded-card p-4 flex flex-col gap-3 ${o.status === "cancelled" ? "opacity-75" : ""}`}>
      <OrderHead o={o} />
      <Route o={o} />
      <Meta o={o} />
      {o.status === "completed" &&
        (o.rating != null ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">تقييمك:</span>
            <span className="flex gap-0.5" dir="ltr">
              {[1, 2, 3, 4, 5].map((n) => (
                <Icon key={n} name="star" className={`w-5 h-5 ${n <= (o.rating ?? 0) ? "text-accent fill-current" : "text-line-2"}`} />
              ))}
            </span>
          </div>
        ) : (
          <RateOrder code={o.code} />
        ))}
    </article>
  );
}

function RentalRow({ b }: { b: BookingDTO }) {
  return (
    <Link href={`/bookings/${b.code}`} className="bg-panel border border-line rounded-card p-4 shadow-sm flex items-center justify-between gap-3">
      <div>
        <div className="font-bold">{b.vehicleName}</div>
        <div className="text-sm text-muted mt-0.5">
          <span dir="ltr">#{b.code}</span> · {labelDateArabic(b.startsAt)} · {labelTime(b.startsAt)}
        </div>
      </div>
      <span className="font-extrabold text-emph">{formatEgp(b.priceSnapshot.total)}</span>
    </Link>
  );
}
