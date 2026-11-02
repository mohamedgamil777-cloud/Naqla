import Link from "next/link";
import { getDashboard } from "@/services/admin-service";
import { driverEarnings, driverPayoutTotals } from "@/db/lib/drivers";
import { totalExpenses } from "@/db/lib/expenses";
import { requirePermission } from "@/lib/authz";
import { can } from "@/lib/permissions";
import { formatEgp } from "@/lib/money";
import { labelDateArabic, labelTime } from "@/lib/time";
import { BookingStatusBadge } from "@/components/ui";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { role } = await requirePermission("dashboard:read");
  const { denied } = await searchParams;
  const d = await getDashboard();
  const showFinance = can(role, "finance:read");

  let fin = { owed: 0, paid: 0, expenses: 0 };
  if (showFinance) {
    // totals are summed in the database
    const [earnings, paidTotals, expenses] = await Promise.all([
      driverEarnings(),
      driverPayoutTotals(),
      totalExpenses(),
    ]);
    const earned = [...earnings.values()].reduce((s, n) => s + n, 0);
    const paid = [...paidTotals.values()].reduce((s, n) => s + n, 0);
    fin = { owed: Math.max(0, earned - paid), paid, expenses };
  }

  const fleet = [
    { label: "متاحة", value: d.counts.available, dot: "bg-ok" },
    { label: "محجوزة", value: d.counts.reserved, dot: "bg-reserved" },
    { label: "جاري تأجيرها", value: d.activeRentals, dot: "bg-rented" },
    { label: "صيانة", value: d.counts.maintenance, dot: "bg-booked" },
  ];
  const fleetTotal = fleet.reduce((sum, f) => sum + f.value, 0);

  const money = [
    {
      label: "المُحصّل النهاردة",
      value: formatEgp(d.collectedToday),
      sub: `المتوقع: ${formatEgp(d.expectedToday)}`,
    },
    { label: "إجمالي المُحصّل", value: formatEgp(d.collectedTotal) },
    { label: "التأمينات المحتجزة", value: formatEgp(d.depositsHeld) },
    { label: "حجوزات النهاردة", value: String(d.todaysBookings), sub: `إلغاءات: ${d.cancellations}` },
  ];

  return (
    <div className="flex flex-col gap-5">
      {denied ? (
        <div
          role="alert"
          className="bg-booked-soft text-booked rounded-xl px-4 py-3 font-semibold flex items-center gap-2"
        >
          <Icon name="alert" className="w-5 h-5 shrink-0" />
          مش عندك صلاحية تفتح الصفحة دي. لو محتاجها كلّم المدير العام.
        </div>
      ) : null}
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-sm text-muted mt-0.5">{labelDateArabic(new Date())}</p>
        </div>
      </header>

      {/* Money: one strip, columns split by hairlines */}
      <section className="border border-line rounded-card overflow-hidden grid grid-cols-2 lg:grid-cols-4 gap-px bg-line">
        {money.map((m) => (
          <div key={m.label} className="bg-panel p-4 md:p-5">
            <div className="text-[13px] text-muted">{m.label}</div>
            <div className="mt-1 text-2xl font-bold text-emph">{m.value}</div>
            {m.sub && <div className="mt-0.5 text-xs text-muted">{m.sub}</div>}
          </div>
        ))}
      </section>

      {/* Fleet status: proportions at a glance, every colour also labelled */}
      <section className="bg-panel border border-line rounded-card p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">حالة العربيات</h2>
          <Link href="/admin/fleet" className="text-sm font-semibold text-primary hover:underline">
            إدارة العربيات
          </Link>
        </div>
        <div className="mt-3 h-2.5 rounded-full bg-panel-2 overflow-hidden flex" aria-hidden>
          {fleetTotal > 0 &&
            fleet.map((f) => (
              <span key={f.label} className={f.dot} style={{ width: `${(f.value / fleetTotal) * 100}%` }} />
            ))}
        </div>
        <ul className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
          {fleet.map((f) => (
            <li key={f.label} className="flex items-center gap-2 text-sm">
              <span className={`w-2.5 h-2.5 rounded-sm ${f.dot}`} aria-hidden />
              <span className="text-ink-2">{f.label}</span>
              <span className="ms-auto md:ms-0 font-bold text-emph">{f.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className={`grid gap-5 items-start ${showFinance ? "lg:grid-cols-[minmax(0,1fr)_19rem]" : ""}`}>
        {/* Upcoming */}
        <section className="bg-panel border border-line rounded-card">
          <div className="flex items-center justify-between px-4 md:px-5 py-3.5 border-b border-line">
            <h2 className="font-semibold">الحجوزات القادمة</h2>
            <Link href="/admin/bookings" className="text-primary font-semibold text-sm hover:underline">
              كل الحجوزات
            </Link>
          </div>
          {d.upcoming.length === 0 ? (
            <p className="text-muted px-5 py-8 text-center">مفيش حجوزات قادمة.</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.upcoming.map((b) => (
                <li key={b.code}>
                  <Link
                    href={`/admin/bookings/${b.code}`}
                    className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 hover:bg-panel-2/60"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {b.vehicleName}{" "}
                        <span className="text-muted font-normal text-sm" dir="ltr">
                          #{b.code}
                        </span>
                      </div>
                      <div className="text-sm text-muted">
                        {labelDateArabic(b.startsAt)} · {labelTime(b.startsAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-emph">{formatEgp(b.priceSnapshot.total)}</span>
                      <BookingStatusBadge status={b.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Financials (نثريات + تسديدات) — finance/super-admin only */}
        {showFinance && (
          <section className="bg-panel border border-line rounded-card">
            <h2 className="font-semibold px-4 md:px-5 py-3.5 border-b border-line">الجزء المالي</h2>
            <ul className="divide-y divide-line">
              {[
                {
                  href: "/admin/settlements",
                  label: "مستحق للسواقين",
                  value: formatEgp(fin.owed),
                  sub: `مدفوع: ${formatEgp(fin.paid)}`,
                  icon: "banknote" as const,
                },
                {
                  href: "/admin/expenses",
                  label: "النثريات",
                  value: formatEgp(fin.expenses),
                  icon: "receipt" as const,
                },
                {
                  href: "/admin/finance",
                  label: "الحسابات التفصيلية",
                  value: "تقارير الدخل",
                  icon: "trendingUp" as const,
                },
              ].map((r) => (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    className="flex items-center gap-3 px-4 md:px-5 py-3.5 hover:bg-panel-2/60"
                  >
                    <Icon name={r.icon} className="w-5 h-5 text-muted shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-muted">{r.label}</div>
                      <div className="font-bold text-emph">{r.value}</div>
                      {r.sub && <div className="text-xs text-muted">{r.sub}</div>}
                    </div>
                    <Icon name="chevronLeft" className="w-4 h-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
