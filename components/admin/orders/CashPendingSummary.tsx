import { formatEgp } from "@/lib/money";
import type { DeliveryOrderDTO } from "@/types";
import { Icon } from "@/components/Icons";

type CashPendingSummaryProps = { orders: DeliveryOrderDTO[] };

/** Cash still with the drivers: completed cash orders nobody recorded as handed in. */
export function CashPendingSummary({ orders }: CashPendingSummaryProps) {
  if (orders.length === 0) return null;

  const byDriver = new Map<string, { name: string; count: number; amount: number }>();
  for (const o of orders) {
    const key = o.driverId ?? "none";
    const row = byDriver.get(key) ?? { name: o.driverName ?? "بدون سائق", count: 0, amount: 0 };
    row.count += 1;
    row.amount += o.priceSnapshot.total;
    byDriver.set(key, row);
  }
  const total = orders.reduce((s, o) => s + o.priceSnapshot.total, 0);

  return (
    <div className="bg-reserved-soft border border-line rounded-card p-4 flex flex-col gap-2">
      <div className="font-extrabold">
        <Icon name="banknote" className="w-4 h-4 inline-block align-[-3px] me-1.5" />كاش لسه مع السواقين: {formatEgp(total)} في {orders.length} طلب
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {[...byDriver.entries()].map(([key, d]) => (
          <span key={key} className="rounded-full bg-panel px-3 py-1 font-bold">
            {d.name}: {formatEgp(d.amount)} ({d.count})
          </span>
        ))}
      </div>
      <span className="text-xs text-muted">لما السواق يسلّمك الفلوس، دوس «استلمت الكاش» على كل طلب تحت.</span>
    </div>
  );
}
