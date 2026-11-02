import { assignDeliveryDriverAction, setDriverFeeAction } from "@/actions/admin/delivery-orders";
import { piastresToEgp } from "@/lib/money";
import type { RatingStat } from "@/services/ratings";
import type { DeliveryOrderDTO, StaffDTO } from "@/types";
import { ORDER_STATUS, isOnTheRoad, isOpenOrder } from "./status";
import { Icon } from "@/components/Icons";

type OrderDriverPanelProps = {
  order: DeliveryOrderDTO;
  drivers: StaffDTO[];
  ratings: Record<string, RatingStat>;
};

function driverOptionLabel(driver: StaffDTO, rating?: RatingStat) {
  const stars = rating ? ` ⭐${rating.avg.toFixed(1)}` : "";
  const away = driver.available ? "" : " (مش متاح)";
  return `${driver.name}${stars}${away}`;
}

/** Assign the driver and set the driver's fee for this order. */
export function OrderDriverPanel({ order, drivers, ratings }: OrderDriverPanelProps) {
  const missingDriver = !order.driverId && isOnTheRoad(order.status);

  return (
    <div className="bg-panel-2 rounded-xl p-3 flex flex-col gap-2">
      <div className="font-bold text-sm"><Icon name="user" className="w-4 h-4 inline-block align-[-3px] me-1.5" />السائق: {order.driverName ?? "لسه متعيّنش"}</div>

      {missingDriver && (
        <div className="bg-booked-soft text-booked rounded-lg px-3 py-2 text-sm font-bold">
          <Icon name="alert" className="w-4 h-4 inline-block align-[-3px] me-1.5" />الطلب حالته «{ORDER_STATUS[order.status].label}» بس مفيش سواق متعيّن — اختار سواق ودوس «تعيين»
          عشان العميل يقدر يكلّمه.
        </div>
      )}

      {isOpenOrder(order.status) && (
        <form action={assignDeliveryDriverAction} className="flex gap-2 items-center">
          <input type="hidden" name="code" value={order.code} />
          <select
            key={order.driverId ?? "none"}
            name="driverId"
            defaultValue={order.driverId ?? ""}
            className="rounded-xl border border-line-2 bg-panel px-3 py-2 flex-1 text-base lg:text-sm"
          >
            <option value="">— بدون سائق —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {driverOptionLabel(d, ratings[d.id])}
              </option>
            ))}
          </select>
          <button className="rounded-xl bg-primary text-white px-4 py-2 font-bold tap">تعيين</button>
        </form>
      )}

      {drivers.length === 0 && <span className="text-xs text-muted">مفيش سواقين — ضيفهم من «الموظفين».</span>}

      <form action={setDriverFeeAction} className="flex gap-2 items-center">
        <input type="hidden" name="code" value={order.code} />
        <span className="text-sm font-bold"><Icon name="banknote" className="w-4 h-4 inline-block align-[-3px] me-1.5" />أجر السائق (جنيه):</span>
        <input
          name="fee"
          type="number"
          min="0"
          step="1"
          defaultValue={order.driverFee ? piastresToEgp(order.driverFee) : ""}
          placeholder="حسب المحافظة"
          className="w-28 rounded-xl border border-line-2 bg-panel px-3 py-1.5 text-base lg:text-sm"
        />
        <button className="rounded-xl bg-primary-soft text-primary-ink px-3 py-1.5 font-bold tap">حفظ</button>
      </form>
    </div>
  );
}
