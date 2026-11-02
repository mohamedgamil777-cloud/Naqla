import { changeOrderSizeAction } from "@/actions/admin/delivery-orders";
import { formatEgp } from "@/lib/money";
import type { CategoryDTO, DeliveryOrderDTO } from "@/types";

type OrderSizeFormProps = { order: DeliveryOrderDTO; sizes: CategoryDTO[] };

/** The admin can switch the truck size; the price is recomputed on the server. */
export function OrderSizeForm({ order, sizes }: OrderSizeFormProps) {
  const currentIsListed = sizes.some((s) => s.id === order.categoryId);

  return (
    <form
      action={changeOrderSizeAction}
      className="bg-panel-2 rounded-xl p-3 flex flex-wrap gap-2 items-center"
    >
      <input type="hidden" name="code" value={order.code} />
      <span className="font-bold text-sm">🚚 حجم العربية:</span>
      <select
        key={order.categoryId}
        name="categoryId"
        defaultValue={order.categoryId}
        className="rounded-xl border border-line-2 bg-panel px-3 py-2 flex-1 min-w-40 text-base lg:text-sm"
      >
        {!currentIsListed && <option value={order.categoryId}>{order.sizeName} (الحالي)</option>}
        {sizes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} · {s.sizeCode} — {formatEgp(s.baseFare)} + {formatEgp(s.perKm)}/كم
          </option>
        ))}
      </select>
      <button className="rounded-xl bg-primary-soft text-primary-ink px-4 py-2 font-bold tap">
        تغيير الحجم
      </button>
      <span className="text-xs text-muted w-full">
        السعر بيتحسب من جديد بنفس المسافة والعمالة، والخصم بيفضل زي ما هو. العميل بيتبلّغ.
      </span>
    </form>
  );
}
