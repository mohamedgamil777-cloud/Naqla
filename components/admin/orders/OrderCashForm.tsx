import { setOrderCashAction } from "@/actions/admin/delivery-orders";
import { formatEgp, piastresToEgp } from "@/lib/money";
import { labelDateArabic, labelTime } from "@/lib/time";
import type { DeliveryOrderDTO } from "@/types";
import { Icon } from "@/components/Icons";

type OrderCashFormProps = { order: DeliveryOrderDTO };

/** Cash handed in by the driver (cash orders only — account orders go on the company statement). */
export function OrderCashForm({ order }: OrderCashFormProps) {
  const total = order.priceSnapshot.total;

  if (order.cashReceived == null) {
    return (
      <form
        action={setOrderCashAction}
        className="bg-reserved-soft rounded-xl p-3 flex flex-wrap gap-2 items-center"
      >
        <input type="hidden" name="code" value={order.code} />
        <span className="font-bold text-sm"><Icon name="banknote" className="w-4 h-4 inline-block align-[-3px] me-1.5" />الكاش لسه مع السواق — المطلوب {formatEgp(total)}</span>
        <input
          name="amount"
          type="number"
          min="0"
          step="0.5"
          placeholder={String(piastresToEgp(total))}
          className="w-28 rounded-xl border border-line-2 bg-panel px-3 py-1.5 text-base lg:text-sm"
        />
        <button className="rounded-xl bg-ok text-white px-4 py-1.5 font-bold tap">استلمت الكاش</button>
        <span className="text-xs text-muted w-full">
          سيب الخانة فاضية لو استلمت المبلغ كامل، أو اكتب اللي استلمته فعلاً.
        </span>
      </form>
    );
  }

  const receivedAt = order.cashReceivedAt
    ? ` — ${labelDateArabic(order.cashReceivedAt)} ${labelTime(order.cashReceivedAt)}`
    : "";
  const receivedBy = order.cashReceivedBy ? ` — ${order.cashReceivedBy}` : "";

  return (
    <form action={setOrderCashAction} className="bg-ok-soft rounded-xl p-3 flex flex-wrap gap-2 items-center">
      <input type="hidden" name="code" value={order.code} />
      <input type="hidden" name="undo" value="1" />
      <span className="font-bold text-sm text-ok">
        اتسلّم {formatEgp(order.cashReceived)}
        {receivedAt}
        {receivedBy}
      </span>
      {order.cashReceived !== total && (
        <span className="text-sm font-bold text-booked">
          فرق {formatEgp(total - order.cashReceived)} عن المطلوب
        </span>
      )}
      <button className="rounded-xl text-booked border border-booked-soft px-3 py-1 text-sm font-bold tap">
        تراجع
      </button>
    </form>
  );
}
