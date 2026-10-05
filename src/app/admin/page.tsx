import Link from "next/link";
import { getDashboard } from "@/services/admin-service";
import { repo } from "@/data/repo";
import { getAdminRole } from "@/services/admin-auth";
import { formatEgp } from "@/lib/money";
import { labelDateArabic, labelTime } from "@/lib/time";
import { BookingStatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const d = await getDashboard();
  const role = await getAdminRole();
  const showFinance = role === "super_admin" || role === "finance";

  let fin = { owed: 0, paid: 0, expenses: 0 };
  if (showFinance) {
    const [orders, payouts, expenses] = await Promise.all([
      repo.listDeliveryOrders(),
      repo.listDriverPayouts(),
      repo.listExpenses(),
    ]);
    const earned = orders.filter((o) => o.status === "completed").reduce((s, o) => s + (o.driverFee || 0), 0);
    const paid = payouts.reduce((s, p) => s + p.amount, 0);
    fin = { owed: Math.max(0, earned - paid), paid, expenses: expenses.reduce((s, e) => s + e.amount, 0) };
  }

  const tiles = [
    { label: "متاحة", value: d.counts.available, color: "text-ok", bg: "bg-ok-soft" },
    { label: "محجوزة", value: d.counts.reserved, color: "text-reserved", bg: "bg-reserved-soft" },
    { label: "جاري تأجيرها", value: d.activeRentals, color: "text-rented", bg: "bg-rented-soft" },
    { label: "صيانة", value: d.counts.maintenance, color: "text-booked", bg: "bg-booked-soft" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">لوحة التحكم</h1>
        <span className="text-muted text-sm">{labelDateArabic(new Date())}</span>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-2xl p-5 ${t.bg}`}>
            <div className={`text-4xl font-extrabold ${t.color}`}>{t.value}</div>
            <div className="mt-1 font-semibold text-ink-2">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl p-5 bg-primary text-white">
          <div className="text-sm text-white/80">المُحصّل النهاردة</div>
          <div className="text-3xl font-extrabold mt-1">{formatEgp(d.collectedToday)}</div>
          <div className="text-xs text-white/70 mt-1">المتوقع من حجوزات اليوم: {formatEgp(d.expectedToday)}</div>
        </div>
        <div className="rounded-2xl p-5 bg-panel border border-line">
          <div className="text-sm text-muted">إجمالي المُحصّل</div>
          <div className="text-3xl font-extrabold mt-1 text-ok">{formatEgp(d.collectedTotal)}</div>
        </div>
        <div className="rounded-2xl p-5 bg-panel border border-line">
          <div className="text-sm text-muted">التأمينات المحتجزة</div>
          <div className="text-3xl font-extrabold mt-1">{formatEgp(d.depositsHeld)}</div>
        </div>
        <div className="rounded-2xl p-5 bg-panel border border-line">
          <div className="text-sm text-muted">حجوزات النهاردة</div>
          <div className="text-3xl font-extrabold mt-1">{d.todaysBookings}</div>
          <div className="text-xs text-muted mt-1">إلغاءات: {d.cancellations}</div>
        </div>
      </div>

      {/* Financials (نثريات + تسديدات) — finance/super-admin only */}
      {showFinance && (
        <div>
          <h2 className="font-extrabold text-lg mb-3">الجزء المالي</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href="/admin/settlements" className="rounded-2xl p-5 bg-rented-soft text-rented tap">
              <div className="text-sm font-bold opacity-90">مستحق للسواقين</div>
              <div className="text-3xl font-extrabold mt-1">{formatEgp(fin.owed)}</div>
              <div className="text-xs opacity-80 mt-1">تسديدات مدفوعة: {formatEgp(fin.paid)} ›</div>
            </Link>
            <Link href="/admin/expenses" className="rounded-2xl p-5 bg-booked-soft text-booked tap">
              <div className="text-sm font-bold opacity-90">النثريات</div>
              <div className="text-3xl font-extrabold mt-1">{formatEgp(fin.expenses)}</div>
              <div className="text-xs opacity-80 mt-1">إدارة المصاريف ›</div>
            </Link>
            <Link href="/admin/finance" className="rounded-2xl p-5 bg-panel border border-line tap">
              <div className="text-sm text-muted">الحسابات التفصيلية</div>
              <div className="text-xl font-extrabold mt-2 text-primary">تقارير الدخل ›</div>
            </Link>
          </div>
        </div>
      )}

      {/* Upcoming */}
      <div className="bg-panel border border-line rounded-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-extrabold text-lg">الحجوزات القادمة</h2>
          <Link href="/admin/bookings" className="text-primary font-semibold text-sm">كل الحجوزات ›</Link>
        </div>
        {d.upcoming.length === 0 ? (
          <p className="text-muted">مفيش حجوزات قادمة.</p>
        ) : (
          <div className="flex flex-col divide-y divide-line">
            {d.upcoming.map((b) => (
              <div key={b.code} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <div className="font-bold truncate">{b.vehicleName} <span className="text-muted font-normal">#{b.code}</span></div>
                  <div className="text-sm text-muted">{labelDateArabic(b.startsAt)} — {labelTime(b.startsAt)}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-primary">{formatEgp(b.priceSnapshot.total)}</span>
                  <BookingStatusBadge status={b.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
