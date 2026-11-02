import { deletePayoutAction } from "@/actions/admin/finance";
import { driverEarnings, driverPayoutTotals, listDriverPayouts, listDrivers } from "@/db/lib/drivers";
import { formatEgp } from "@/lib/money";
import { labelDateArabic } from "@/lib/time";
import { PayoutForm } from "@/components/admin/PayoutForm";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

const METHOD: Record<string, string> = { cash: "كاش", bank: "تحويل بنكي", wallet: "محفظة" };

export default async function SettlementsPage() {
  await requirePermission("payout:manage");
  // balances are summed in the database; the list below shows the most recent payouts
  const [drivers, earnings, paidTotals, payouts] = await Promise.all([
    listDrivers(),
    driverEarnings(),
    driverPayoutTotals(),
    listDriverPayouts(),
  ]);

  const rows = drivers.map((d) => {
    const earned = earnings.get(d.id) ?? 0;
    const paid = paidTotals.get(d.id) ?? 0;
    return { driver: d, earned, paid, owed: earned - paid };
  });
  const totalOwed = rows.reduce((s, r) => s + Math.max(0, r.owed), 0);
  const totalPaid = [...paidTotals.values()].reduce((s, p) => s + p, 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold">تسديدات السواقين</h1>
        <p className="text-muted">مستحقات كل سائق (المكتسب من التوصيلات − المدفوع) وتسجيل المدفوعات.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tile label="إجمالي المستحق للسواقين" value={formatEgp(totalOwed)} tone="rented" />
        <Tile label="إجمالي المدفوع" value={formatEgp(totalPaid)} tone="ok" />
      </div>

      {/* Per-driver balances */}
      <div className="bg-panel border border-line rounded-card divide-y divide-line">
        {rows.length === 0 && <div className="p-4 text-muted text-center">مفيش سواقين.</div>}
        {rows.map((r) => (
          <div key={r.driver.id} className="p-4 flex items-center justify-between gap-2 flex-wrap">
            <div className="font-bold">🧑‍✈️ {r.driver.name}</div>
            <div className="flex gap-4 text-sm">
              <span className="text-ink-2">
                كسب: <b>{formatEgp(r.earned)}</b>
              </span>
              <span className="text-ink-2">
                مدفوع: <b>{formatEgp(r.paid)}</b>
              </span>
              <span className={r.owed > 0 ? "text-rented font-extrabold" : "text-ok font-extrabold"}>
                متبقّي: {formatEgp(Math.max(0, r.owed))}
              </span>
            </div>
          </div>
        ))}
      </div>

      <PayoutForm drivers={drivers} />

      {/* Payout history */}
      {payouts.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-extrabold">سجل التسديدات</h2>
          {payouts.map((p) => (
            <div
              key={p.id}
              className="bg-panel border border-line rounded-card p-3 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="font-bold text-sm">
                  {p.driverName ?? "—"} · {formatEgp(p.amount)}
                </div>
                <div className="text-xs text-muted">
                  {METHOD[p.method] ?? p.method} · {labelDateArabic(p.createdAt)}
                  {p.note ? ` · ${p.note}` : ""}
                </div>
              </div>
              <form action={deletePayoutAction}>
                <input type="hidden" name="id" value={p.id} />
                <button className="text-booked text-sm font-bold border border-booked-soft rounded-lg px-3 py-1.5 tap">
                  حذف
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone: "rented" | "ok" }) {
  const cls = tone === "rented" ? "bg-rented-soft text-rented" : "bg-ok-soft text-ok";
  return (
    <div className={`rounded-card p-4 ${cls}`}>
      <div className="text-sm font-bold opacity-90">{label}</div>
      <div className="text-2xl font-extrabold mt-1">{value}</div>
    </div>
  );
}
