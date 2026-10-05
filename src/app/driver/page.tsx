import Link from "next/link";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { cairoDateISO, labelTime } from "@/lib/time";
import { fullDateLabel } from "@/lib/client-time";
import { LinkButton } from "@/components/ui";
import { DriverNotify, type NotifyTrip } from "@/components/driver/DriverNotify";
import { OrderActions } from "@/components/driver/OrderActions";
import { DriverSwitch } from "@/components/driver/DriverSwitch";
import { DriverTabs } from "@/components/driver/DriverTabs";
import type { DeliveryOrderDTO } from "@/data/types";

export const dynamic = "force-dynamic";

export default async function DriverPage() {
  const session = await getSession();

  // Not logged in → send them to login and back here.
  if (!session) {
    return (
      <Centered emoji="🔑" title="سجّل دخولك الأول">
        <p className="text-muted">ادخل برقم موبايلك المسجّل عند الشركة عشان تشوف شغلك.</p>
        <LinkButton href="/login?next=/driver" full>
          الدخول
        </LinkButton>
      </Centered>
    );
  }

  const driver = await repo.getStaffByPhone(session.phone);
  if (!driver || driver.role !== "driver") {
    return (
      <Centered emoji="🚫" title="الرقم ده مش مسجّل كسائق">
        <p className="text-muted">
          أنت داخل برقم: <span dir="ltr" className="font-bold">{session.phone}</span>. لو ده مش رقمك كسائق، ادخل برقمك الصح.
        </p>
        <DriverSwitch label="🔁 ادخل برقم السائق" />
        <p className="text-muted text-sm">لو رقمك مش متسجّل، كلّم إدارة الشركة عشان يضيفوك كسائق.</p>
      </Centered>
    );
  }

  const allOrders = await repo.listDeliveryOrdersByDriver(driver.id);
  const todayISO = cairoDateISO(new Date());
  // Deliveries the driver still has to do (assigned or already on the way).
  const orders = allOrders.filter((o) => o.status === "assigned" || o.status === "en_route");

  const notifyTrips: NotifyTrip[] = orders
    .map((o) => ({
      code: o.code,
      startMs: o.scheduledAt.getTime(),
      timeLabel: labelTime(o.scheduledAt),
      dayLabel: dayLabelFor(cairoDateISO(o.scheduledAt), todayISO),
      vehicleName: o.sizeName,
      place: o.dropoffAddress || "توصيل A→B",
    }))
    .sort((a, b) => a.startMs - b.startMs);

  // Group by Cairo scheduled date.
  const orderGroups = new Map<string, DeliveryOrderDTO[]>();
  for (const o of orders) {
    const key = cairoDateISO(o.scheduledAt);
    (orderGroups.get(key) ?? orderGroups.set(key, []).get(key)!).push(o);
  }
  const orderDays = [...orderGroups.keys()].sort();

  const firstName = (driver.name || "").split(" ")[0] || "يا كابتن";

  return (
    <div className="p-4 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">أهلاً {firstName} 👋</h1>
          <p className="text-muted">دي كل التوصيلات المطلوبة منك.</p>
        </div>
        <DriverSwitch label="خروج" subtle />
      </div>

      <DriverTabs active="now" />

      <DriverNotify trips={notifyTrips} />

      {orders.length === 0 ? (
        <div className="bg-panel border border-line rounded-card p-8 text-center">
          <div className="text-5xl mb-3">🛋️</div>
          <p className="text-lg font-bold">مفيش توصيلات عليك دلوقتي</p>
          <p className="text-muted mt-1">هتلاقي الطلبات هنا أول ما الإدارة تكلّفك.</p>
        </div>
      ) : (
        orderDays.map((key) => (
          <section key={key} className="flex flex-col gap-3">
            <h2 className="text-lg font-extrabold text-primary sticky top-16 bg-ground py-1 z-10">
              📦 {dayLabelFor(key, todayISO)}
              <span className="text-muted font-bold text-sm"> · {orderGroups.get(key)!.length} توصيلة</span>
            </h2>
            {orderGroups.get(key)!.map((o) => (
              <OrderCard key={o.code} o={o} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function OrderCard({ o }: { o: DeliveryOrderDTO }) {
  const phone = o.contactPhone ?? "";
  const wa = phone.replace(/[^0-9]/g, "");

  return (
    <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-3xl font-extrabold text-primary leading-none">{labelTime(o.scheduledAt)}</div>
          <div className="text-sm text-muted mt-1">توصيلة #{o.code}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-primary-soft text-primary-ink px-3 py-1 text-sm font-bold">
            {o.sizeName}{o.sizeCode ? ` · ${o.sizeCode}` : ""}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${o.status === "en_route" ? "bg-ok-soft text-ok" : "bg-reserved-soft text-reserved"}`}>
            {o.status === "en_route" ? "في الطريق" : "متعيّن ليك"}
          </span>
        </div>
      </div>

      {/* From → To (the trip location) */}
      <div className="flex flex-col gap-1.5 text-[15px]">
        <InfoRow icon="📍" text={`من: ${o.pickupAddress || "على الخريطة"}`} />
        <InfoRow icon="🏁" text={`لـ: ${o.dropoffAddress || "على الخريطة"}`} />
        <InfoRow icon="🛣️" text={`${o.km} كم`} />
        {o.loaders > 0 && <InfoRow icon="👷" text={`عمالة مشال: ${o.loaders} أفراد`} />}
      </div>

      {/* Customer + one-tap contact */}
      <div className="bg-panel-2 rounded-2xl p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 font-bold">
          <span aria-hidden>👤</span> {o.contactName ?? "العميل"}
        </div>
        {phone && (
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${phone}`} className="rounded-2xl bg-ok text-white py-3 text-center text-lg font-extrabold tap">📞 اتصل</a>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="rounded-2xl bg-[#25D366] text-white py-3 text-center text-lg font-extrabold tap">💬 واتساب</a>
          </div>
        )}
      </div>

      <Link
        href={`/driver/trip/${o.code}`}
        className="rounded-2xl border-2 border-line-2 text-primary py-3 text-center text-lg font-extrabold tap"
      >
        🗺️ شوف الطريق والتفاصيل
      </Link>

      <OrderActions code={o.code} status={o.status} />
    </div>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="w-6 text-center">{icon}</span>
      <span className="font-semibold">{text}</span>
    </div>
  );
}

function Centered({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 min-h-[60vh] flex flex-col items-center justify-center text-center gap-3">
      <div className="text-6xl">{emoji}</div>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <div className="flex flex-col gap-3 w-full max-w-xs">{children}</div>
    </div>
  );
}

function dayLabelFor(iso: string, todayISO: string): string {
  if (iso === todayISO) return "النهاردة";
  const tomorrowISO = cairoDateISO(new Date(Date.now() + 24 * 60 * 60 * 1000));
  if (iso === tomorrowISO) return "بكرة";
  return fullDateLabel(iso);
}
