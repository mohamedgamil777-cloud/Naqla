import Link from "next/link";
import { listHref } from "@/components/Pagination";
import type { DeliveryOrderFilter } from "@/types";

type OrdersFilterProps = {
  status: DeliveryOrderFilter["status"];
  q: string;
  counts: { open: number; new: number };
};

const TABS: { label: string; status: DeliveryOrderFilter["status"] }[] = [
  { label: "الكل", status: undefined },
  { label: "جديد", status: "new" },
  { label: "جاري", status: "open" },
  { label: "تم التوصيل", status: "completed" },
  { label: "ملغي", status: "cancelled" },
];

/** Status tabs + search; both live in the URL so a filtered list can be shared. */
export function OrdersFilter({ status, q, counts }: OrdersFilterProps) {
  return (
    <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = tab.status === status;
          const badge = tab.status === "new" ? counts.new : tab.status === "open" ? counts.open : 0;
          return (
            <Link
              key={tab.label}
              href={listHref("/admin/orders", { status: tab.status, q })}
              className={`px-4 py-2 rounded-xl font-semibold text-sm ${active ? "bg-primary text-white" : "bg-panel-2 text-ink-2"}`}
            >
              {tab.label}
              {badge > 0 ? ` (${badge})` : ""}
            </Link>
          );
        })}
      </div>
      <form method="get" action="/admin/orders" className="flex flex-wrap items-end gap-3">
        {status && <input type="hidden" name="status" value={status} />}
        <label className="flex-1 min-w-48">
          <span className="block text-xs font-bold text-ink-2 mb-1">بحث</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="رقم الطلب، اسم أو موبايل العميل، العنوان"
            className="w-full rounded-xl border border-line-2 bg-panel px-3 py-2 text-base lg:text-sm"
          />
        </label>
        <button className="rounded-xl px-5 py-2 font-bold bg-ink text-white">بحث</button>
      </form>
    </div>
  );
}
