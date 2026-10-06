import Link from "next/link";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { cairoDateISO, labelDateArabic, labelTime } from "@/lib/time";
import { fullDateLabel } from "@/lib/client-time";
import { LinkButton } from "@/components/ui";
import { Icon } from "@/components/Icons";
import { DriverNotify, type NotifyTrip } from "@/components/driver/DriverNotify";
import { OrderActions } from "@/components/driver/OrderActions";
import { DriverSwitch } from "@/components/driver/DriverSwitch";
import { DriverTabs } from "@/components/driver/DriverTabs";
import { Card, DriverNotice, Route, StatusPill, TripStats } from "@/components/driver/parts";
import { toggleAvailability } from "@/app/driver/actions";
import type { DeliveryOrderDTO, StaffDTO } from "@/data/types";

export const dynamic = "force-dynamic";

const ACTIVE = new Set(["assigned", "en_route", "arrived"]);

export default async function DriverPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const session = await getSession();

  if (!session) {
    return (
      <DriverNotice icon="lock" title="سجّل دخولك الأول">
        <p className="text-muted">ادخل برقم موبايلك المسجّل عند الشركة عشان تشوف شغلك.</p>
        <LinkButton href="/login?next=/driver" full>
          الدخول
        </LinkButton>
      </DriverNotice>
    );
  }

  const driver = await repo.getStaffByPhone(session.phone);
  if (!driver || driver.role !== "driver") {
    return (
      <DriverNotice icon="user" title="الرقم ده مش مسجّل كسائق">
        <p className="text-muted">
          أنت داخل برقم: <span dir="ltr" className="font-bold">{session.phone}</span>. لو ده مش رقمك كسائق، ادخل برقمك الصح.
        </p>
        <DriverSwitch label="ادخل برقم السائق" />
        <p className="text-muted text-sm">لو رقمك مش متسجّل، كلّم إدارة الشركة عشان يضيفوك كسائق.</p>
      </DriverNotice>
    );
  }

  const todayISO = cairoDateISO(new Date());
  const orders = (await repo.listDeliveryOrdersByDriver(driver.id))
    .filter((o) => ACTIVE.has(o.status))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  // "شغلي" = anything already started + everything due up to today; "القادمة" = later days.
  const now = orders.filter((o) => o.status !== "assigned" || cairoDateISO(o.scheduledAt) <= todayISO);
  const upcoming = orders.filter((o) => !now.includes(o));
  const showUpcoming = tab === "upcoming";

  const notifyTrips: NotifyTrip[] = orders.map((o) => ({
    code: o.code,
    startMs: o.scheduledAt.getTime(),
    timeLabel: labelTime(o.scheduledAt),
    dayLabel: dayLabelFor(cairoDateISO(o.scheduledAt), todayISO),
    vehicleName: o.sizeName,
    place: o.dropoffAddress || "توصيلة",
  }));

  const list = showUpcoming ? upcoming : now;
  const [current, ...rest] = list;

  return (
    <div className="p-4 flex flex-col gap-5">
      <Greeting driver={driver} />
      <DriverTabs active={showUpcoming ? "upcoming" : "now"} nowCount={now.length} />

      {list.length === 0 ? (
        <Card className="p-8 text-center flex flex-col items-center gap-2">
          <span className="w-16 h-16 rounded-full bg-primary-soft text-primary grid place-items-center">
            <Icon name="checkCircle" className="w-8 h-8" />
          </span>
          <p className="text-lg font-extrabold">{showUpcoming ? "مفيش توصيلات جاية" : "مفيش توصيلات عليك دلوقتي"}</p>
          <p className="text-muted">هتلاقي الطلبات هنا أول ما الإدارة تكلّفك.</p>
          {!showUpcoming && upcoming.length > 0 && (
            <Link href="/driver?tab=upcoming" className="mt-2 font-bold text-primary">
              عندك {upcoming.length} توصيلة في الأيام الجاية ‹
            </Link>
          )}
        </Card>
      ) : (
        <>
          {showUpcoming ? (
            list.map((o) => <NextOrder key={o.code} o={o} label={dayLabelFor(cairoDateISO(o.scheduledAt), todayISO)} />)
          ) : (
            <>
              <CurrentOrder o={current} todayISO={todayISO} />
              {rest.map((o) => (
                <NextOrder key={o.code} o={o} label="التوصيلة التالية" />
              ))}
            </>
          )}
        </>
      )}

      <DriverNotify trips={notifyTrips} banner={false} />
    </div>
  );
}

function Greeting({ driver }: { driver: StaffDTO }) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Cairo" }).format(new Date()));
  const hello = hour < 12 ? "صباح الخير" : "مساء الخير";
  return (
    <div className="flex items-center gap-3">
      <span className="relative shrink-0">
        {driver.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={driver.photo} alt={driver.name} className="w-16 h-16 rounded-full object-cover border-2 border-panel shadow-sm" />
        ) : (
          <span className="w-16 h-16 rounded-full bg-primary-soft text-primary grid place-items-center">
            <Icon name="user" className="w-8 h-8" />
          </span>
        )}
        <span className={`absolute bottom-0.5 left-0.5 w-4 h-4 rounded-full border-2 border-ground ${driver.available ? "bg-ok" : "bg-off"}`} aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-muted">{hello}</div>
        <div className="text-xl font-extrabold truncate">{driver.name || "يا كابتن"}</div>
        <form action={toggleAvailability}>
          <button className={`mt-0.5 flex items-center gap-1 text-sm font-bold ${driver.available ? "text-ok" : "text-muted"}`}>
            {driver.available ? "متاح للعمل" : "مش متاح دلوقتي"}
            <Icon name="chevronDown" className="w-4 h-4" />
            <span className="sr-only">— دوس للتغيير</span>
          </button>
        </form>
      </div>
      <DriverSwitch label="خروج" subtle />
    </div>
  );
}

function CurrentOrder({ o, todayISO }: { o: DeliveryOrderDTO; todayISO: string }) {
  const started = o.status !== "assigned";
  return (
    <Card className="overflow-hidden">
      {/* time header */}
      <Link href={`/driver/trip/${o.code}`} className="block bg-primary-soft/70 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-extrabold">الطلب الحالي</span>
          <StatusPill status={o.status} />
        </div>
        <div className="text-ink-2 mt-2">
          {dayLabelFor(cairoDateISO(o.scheduledAt), todayISO)} • {labelDateArabic(o.scheduledAt)}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="flex items-center gap-2 text-4xl font-extrabold text-emph">
            <Icon name="clock" className="w-8 h-8" strokeWidth={2.2} />
            {labelTime(o.scheduledAt)}
          </span>
          <span className="w-10 h-10 rounded-full bg-panel grid place-items-center text-ink-2" aria-hidden>
            <Icon name="chevronLeft" className="w-5 h-5" />
          </span>
        </div>
      </Link>

      <div className="p-4 flex flex-col gap-4">
        <Route o={o} />
        <div className="border-t border-line pt-3">
          <TripStats o={o} />
        </div>
        {started ? (
          <Link
            href={`/driver/trip/${o.code}`}
            className="w-full min-h-[60px] rounded-2xl bg-accent text-on-accent text-xl font-extrabold flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(242,165,65,0.35)]"
          >
            كمّل الرحلة <Icon name="chevronLeft" className="w-6 h-6" strokeWidth={2.6} />
          </Link>
        ) : (
          <OrderActions code={o.code} status={o.status} openTrip />
        )}
      </div>
    </Card>
  );
}

function NextOrder({ o, label }: { o: DeliveryOrderDTO; label: string }) {
  return (
    <Link href={`/driver/trip/${o.code}`} className="block">
      <Card className="p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-reserved-soft text-reserved px-3 py-1 text-sm font-bold">{label}</span>
          <span className="text-2xl font-extrabold text-emph">{labelTime(o.scheduledAt)}</span>
        </div>
        <div className="flex items-center gap-2 font-bold text-lg">
          <span className="truncate">{o.pickupAddress || "على الخريطة"}</span>
          <Icon name="chevronLeft" className="w-5 h-5 text-muted shrink-0" />
          <span className="truncate">{o.dropoffAddress || "على الخريطة"}</span>
        </div>
        <div className="flex items-center gap-4 text-ink-2">
          <span className="flex items-center gap-1.5">
            <Icon name="truck" className="w-5 h-5 text-muted" /> {o.sizeName}
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="map" className="w-5 h-5 text-muted" /> {o.km} كم
          </span>
        </div>
      </Card>
    </Link>
  );
}

function dayLabelFor(iso: string, todayISO: string): string {
  if (iso === todayISO) return "النهاردة";
  const tomorrowISO = cairoDateISO(new Date(Date.now() + 24 * 60 * 60 * 1000));
  if (iso === tomorrowISO) return "بكرة";
  if (iso < todayISO) return "متأخرة";
  return fullDateLabel(iso);
}
