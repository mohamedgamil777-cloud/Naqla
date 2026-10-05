import { repo } from "@/data/repo";
import { formatEgp } from "@/lib/money";
import { labelDateArabic, labelTime } from "@/lib/time";
import { setDeliveryOrderStatus, assignDeliveryDriver, setDriverFeeAction } from "@/app/admin/actions";
import { piastresToEgp } from "@/lib/money";
import type { DeliveryOrderStatus, StaffDTO } from "@/data/types";

export const dynamic = "force-dynamic";

const STATUS: Record<DeliveryOrderStatus, { label: string; cls: string }> = {
  new: { label: "جديد", cls: "bg-rented-soft text-rented" },
  confirmed: { label: "مؤكد · جاري البحث عن سائق", cls: "bg-reserved-soft text-reserved" },
  assigned: { label: "تم تعيين سائق", cls: "bg-primary-soft text-primary-ink" },
  en_route: { label: "السائق في الطريق", cls: "bg-ok-soft text-ok" },
  completed: { label: "تم التوصيل", cls: "bg-ok-soft text-ok" },
  cancelled: { label: "ملغي", cls: "bg-booked-soft text-booked" },
};

export default async function AdminOrdersPage() {
  const [orders, drivers] = await Promise.all([repo.listDeliveryOrders(), repo.listDrivers()]);
  const openCount = orders.filter((o) => o.status === "new").length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold">طلبات التوصيل (A→B)</h1>
        <p className="text-muted">طلبات العملاء من «اطلب توصيلة». {openCount > 0 && <span className="font-bold text-rented">عندك {openCount} طلب جديد.</span>}</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-panel border border-line rounded-card p-8 text-center text-muted">لسه مفيش طلبات توصيل.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => {
            const maps =
              o.pickupLat != null && o.dropoffLat != null
                ? `https://www.google.com/maps/dir/?api=1&origin=${o.pickupLat},${o.pickupLng}&destination=${o.dropoffLat},${o.dropoffLng}`
                : null;
            return (
              <div key={o.code} className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-lg">#{o.code}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span>
                    <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-bold">{o.sizeName}{o.sizeCode ? ` · ${o.sizeCode}` : ""}</span>
                  </div>
                  <span className="font-extrabold text-xl text-primary">{formatEgp(o.priceSnapshot.total)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[15px]">
                  <Row k="الميعاد" v={`${labelDateArabic(o.scheduledAt)} — ${labelTime(o.scheduledAt)}`} />
                  <Row k="المسافة" v={`${o.km} كم`} />
                  <Row k="الاستلام" v={o.pickupAddress || "على الخريطة"} />
                  <Row k="التسليم" v={o.dropoffAddress || "على الخريطة"} />
                  {o.loaders > 0 && <Row k="العمالة" v={`${o.loaders} أفراد`} />}
                  <Row k="العميل" v={o.contactName ?? "-"} />
                  <Row k="الموبايل" v={o.contactPhone ?? "-"} ltr />
                  {o.rating != null && <Row k="تقييم العميل" v={`${"⭐".repeat(o.rating)}${o.ratingComment ? ` — ${o.ratingComment}` : ""}`} />}
                </div>

                {/* Driver assignment */}
                <div className="bg-panel-2 rounded-xl p-3 flex flex-col gap-2">
                  <div className="font-bold text-sm">🧑‍✈️ السائق: {o.driverName ?? "لسه متعيّنش"}</div>
                  {o.status !== "completed" && o.status !== "cancelled" && (
                    <form action={assignDeliveryDriver} className="flex gap-2 items-center">
                      <input type="hidden" name="code" value={o.code} />
                      <select name="driverId" defaultValue={o.driverId ?? ""} className="rounded-xl border border-line-2 bg-panel px-3 py-2 flex-1">
                        <option value="">— اختار سائق —</option>
                        {drivers.map((d: StaffDTO) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <button className="rounded-xl bg-primary text-white px-4 py-2 font-bold tap">تعيين</button>
                    </form>
                  )}
                  {drivers.length === 0 && <span className="text-xs text-muted">مفيش سواقين — ضيفهم من «الموظفين».</span>}
                  <form action={setDriverFeeAction} className="flex gap-2 items-center">
                    <input type="hidden" name="code" value={o.code} />
                    <span className="text-sm font-bold">💵 أجر السائق (جنيه):</span>
                    <input name="fee" type="number" min="0" step="1" defaultValue={o.driverFee ? piastresToEgp(o.driverFee) : ""} placeholder="حسب المحافظة" className="w-28 rounded-xl border border-line-2 bg-panel px-3 py-1.5" />
                    <button className="rounded-xl bg-primary-soft text-primary-ink px-3 py-1.5 font-bold tap">حفظ</button>
                  </form>
                </div>

                <div className="flex flex-wrap gap-2 items-center pt-1">
                  {o.contactPhone && (
                    <a href={`tel:${o.contactPhone}`} className="rounded-xl bg-ok text-white px-4 py-2 font-bold tap">📞 اتصل بالعميل</a>
                  )}
                  {maps && (
                    <a href={maps} target="_blank" rel="noopener noreferrer" className="rounded-xl border-2 border-line-2 text-primary px-4 py-2 font-bold tap">🗺️ الطريق</a>
                  )}
                  {o.status === "new" && (
                    <form action={setDeliveryOrderStatus} className="contents">
                      <input type="hidden" name="code" value={o.code} />
                      <button name="status" value="confirmed" className="rounded-xl bg-primary text-white px-4 py-2 font-bold tap">أكّد الطلب</button>
                      <button name="status" value="cancelled" className="rounded-xl text-booked border border-booked-soft px-4 py-2 font-bold tap">إلغاء</button>
                    </form>
                  )}
                  {(o.status === "confirmed" || o.status === "assigned" || o.status === "en_route") && (
                    <form action={setDeliveryOrderStatus} className="contents">
                      <input type="hidden" name="code" value={o.code} />
                      <button name="status" value="cancelled" className="rounded-xl text-booked border border-booked-soft px-4 py-2 font-bold tap">إلغاء الطلب</button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ k, v, ltr }: { k: string; v: string; ltr?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted">{k}</span>
      <span className="font-semibold text-end" dir={ltr ? "ltr" : undefined}>{v}</span>
    </div>
  );
}
