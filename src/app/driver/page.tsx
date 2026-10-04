import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { cairoDateISO, labelTime } from "@/lib/time";
import { durationLabel, fullDateLabel } from "@/lib/client-time";
import { BookingStatusBadge, LinkButton } from "@/components/ui";
import { DriverNotify, type NotifyTrip } from "@/components/driver/DriverNotify";
import { TripActions } from "@/components/driver/TripActions";
import { DriverSwitch } from "@/components/driver/DriverSwitch";
import type { BookingDTO, BranchDTO } from "@/data/types";

export const dynamic = "force-dynamic";

export default async function DriverPage() {
  const session = await getSession();

  // Not logged in → send them to login and back here.
  if (!session) {
    return (
      <Centered emoji="🔑" title="سجّل دخولك الأول">
        <p className="text-muted">ادخل برقم موبايلك المسجّل عند الشركة عشان تشوف رحلاتك.</p>
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

  const [all, branch] = await Promise.all([repo.listBookingsByDriver(driver.id), repo.defaultBranch()]);
  const todayISO = cairoDateISO(new Date());

  // Today + upcoming trips (plus anything still running), never cancelled/done.
  const trips = all.filter(
    (b) =>
      b.status !== "cancelled" &&
      (b.status === "active" || (cairoDateISO(b.startsAt) >= todayISO && b.status !== "completed"))
  );

  const placeOf = (b: BookingDTO) => (b.delivery ? "توصيل للعميل" : b.branchName);

  const notifyTrips: NotifyTrip[] = trips.map((b) => ({
    code: b.code,
    startMs: b.startsAt.getTime(),
    timeLabel: labelTime(b.startsAt),
    dayLabel: dayLabelFor(cairoDateISO(b.startsAt), todayISO),
    vehicleName: b.vehicleName,
    place: placeOf(b),
  }));

  // Group by Cairo start date, soonest day first.
  const groups = new Map<string, BookingDTO[]>();
  for (const b of trips) {
    const key = cairoDateISO(b.startsAt);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(b);
  }
  const dayKeys = [...groups.keys()].sort();

  const firstName = (driver.name || "").split(" ")[0] || "يا كابتن";

  return (
    <div className="p-4 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">أهلاً {firstName} 👋</h1>
          <p className="text-muted">دي كل الرحلات المطلوبة منك.</p>
        </div>
        <DriverSwitch label="خروج" subtle />
      </div>

      <DriverNotify trips={notifyTrips} />

      {trips.length === 0 ? (
        <div className="bg-panel border border-line rounded-card p-8 text-center">
          <div className="text-5xl mb-3">🛋️</div>
          <p className="text-lg font-bold">مفيش رحلات عليك دلوقتي</p>
          <p className="text-muted mt-1">هتلاقي رحلاتك هنا أول ما الإدارة تكلّفك.</p>
        </div>
      ) : (
        dayKeys.map((key) => (
          <section key={key} className="flex flex-col gap-3">
            <h2 className="text-lg font-extrabold text-primary sticky top-16 bg-ground py-1 z-10">
              {dayLabelFor(key, todayISO)}
              <span className="text-muted font-bold text-sm"> · {groups.get(key)!.length} رحلة</span>
            </h2>
            {groups.get(key)!.map((b) => (
              <TripCard key={b.code} b={b} branch={branch} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function TripCard({ b, branch }: { b: BookingDTO; branch: BranchDTO }) {
  const phone = b.contactPhone ?? "";
  const wa = phone.replace(/[^0-9]/g, "");
  const mapsHref =
    !b.delivery && branch.lat != null && branch.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${branch.lat},${branch.lng}`
      : null;

  return (
    <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-3xl font-extrabold text-primary leading-none">{labelTime(b.startsAt)}</div>
          <div className="text-sm text-muted mt-1">لحد {labelTime(b.endsAt)}</div>
        </div>
        <BookingStatusBadge status={b.status} />
      </div>

      <div className="flex items-center gap-2 text-xl font-extrabold">
        <span aria-hidden>🚚</span> {b.vehicleName}
      </div>

      <div className="flex flex-col gap-1.5 text-[15px]">
        <InfoRow icon="📍" text={b.delivery ? "توصيل للعميل — اتصل تعرف المكان" : branch.name} />
        <InfoRow icon="⏱️" text={durationLabel(b.hours)} />
        {b.loaders > 0 && <InfoRow icon="👷" text={`عمالة مشال: ${b.loaders} أفراد`} />}
      </div>

      {/* Customer + one-tap contact */}
      <div className="bg-panel-2 rounded-2xl p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 font-bold">
          <span aria-hidden>👤</span> {b.contactName ?? "العميل"}
        </div>
        {phone && (
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${phone}`}
              className="rounded-2xl bg-ok text-white py-3 text-center text-lg font-extrabold tap"
            >
              📞 اتصل
            </a>
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-[#25D366] text-white py-3 text-center text-lg font-extrabold tap"
            >
              💬 واتساب
            </a>
          </div>
        )}
      </div>

      {mapsHref && (
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border-2 border-line-2 text-primary py-3 text-center text-lg font-extrabold tap"
        >
          🗺️ الطريق للفرع
        </a>
      )}

      <TripActions code={b.code} status={b.status} />
    </div>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="w-6 text-center">
        {icon}
      </span>
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
  // tomorrow in Cairo
  const tomorrowISO = cairoDateISO(new Date(Date.now() + 24 * 60 * 60 * 1000));
  if (iso === tomorrowISO) return "بكرة";
  return fullDateLabel(iso);
}
