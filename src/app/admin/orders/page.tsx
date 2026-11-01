import { repo } from "@/data/repo";
import { formatEgp } from "@/lib/money";
import { labelDateArabic, labelTime } from "@/lib/time";
import { setDeliveryOrderStatus, assignDeliveryDriver, setDriverFeeAction, changeOrderSizeAction, setOrderCashAction } from "@/app/admin/actions";
import { piastresToEgp } from "@/lib/money";
import type { DeliveryOrderStatus, StaffDTO } from "@/data/types";
import { driverRatings } from "@/services/ratings";
import { PodView } from "@/components/PodView";

export const dynamic = "force-dynamic";

const STATUS: Record<DeliveryOrderStatus, { label: string; cls: string }> = {
  new: { label: "جديد", cls: "bg-rented-soft text-rented" },
  confirmed: { label: "مؤكد · جاري البحث عن سائق", cls: "bg-reserved-soft text-reserved" },
  assigned: { label: "تم تعيين سائق", cls: "bg-primary-soft text-primary-ink" },
  en_route: { label: "السائق في الطريق للاستلام", cls: "bg-ok-soft text-ok" },
  arrived: { label: "السائق وصل للاستلام", cls: "bg-ok-soft text-ok" },
  completed: { label: "تم التوصيل", cls: "bg-ok-soft text-ok" },
  cancelled: { label: "ملغي", cls: "bg-booked-soft text-booked" },
};

export default async function AdminOrdersPage() {
  const [orders, drivers, cats, companies] = await Promise.all([repo.listDeliveryOrders(), repo.listDrivers(), repo.listCategories(), repo.listCompanies()]);
  const companyName = Object.fromEntries(companies.map((c) => [c.id, c.name]));
  const sizes = cats.filter((c) => c.sizeCode && c.active);
  const ratings = driverRatings(orders);
  const openCount = orders.filter((o) => o.status === "new").length;

  // Cash still with the drivers: completed cash orders nobody recorded as handed in.
  const cashPending = orders.filter((o) => o.status === "completed" && o.billing === "cash" && o.cashReceived == null);
  const pendingByDriver = new Map<string, { name: string; count: number; amount: number }>();
  for (const o of cashPending) {
    const k = o.driverId ?? "none";
    const row = pendingByDriver.get(k) ?? { name: o.driverName ?? "بدون سائق", count: 0, amount: 0 };
    row.count += 1;
    row.amount += o.priceSnapshot.total;
    pendingByDriver.set(k, row);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">طلبات التوصيل (A→B)</h1>
          <p className="text-muted">طلبات العملاء من الموقع والتليفون. {openCount > 0 && <span className="font-bold text-rented">عندك {openCount} طلب جديد.</span>}</p>
        </div>
        <a href="/admin/new-order" className="rounded-xl bg-primary text-white px-4 py-2 font-bold tap">☎️ طلب جديد بالتليفون</a>
      </div>

      {cashPending.length > 0 && (
        <div className="bg-reserved-soft border border-line rounded-card p-4 flex flex-col gap-2">
          <div className="font-extrabold">
            💵 كاش لسه مع السواقين: {formatEgp(cashPending.reduce((s, o) => s + o.priceSnapshot.total, 0))} في {cashPending.length} طلب
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {[...pendingByDriver.values()].map((d) => (
              <span key={d.name} className="rounded-full bg-panel px-3 py-1 font-bold">{d.name}: {formatEgp(d.amount)} ({d.count})</span>
            ))}
          </div>
          <span className="text-xs text-muted">لما السواق يسلّمك الفلوس، دوس «استلمت الكاش» على كل طلب تحت.</span>
        </div>
      )}

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
                    {o.companyId && (
                      <a href={`/admin/companies/${o.companyId}`} className="rounded-full bg-primary-soft text-primary-ink px-2 py-0.5 text-xs font-bold">
                        🏢 {companyName[o.companyId] ?? "شركة"} · {o.billing === "account" ? "على الحساب" : "كاش"}
                      </a>
                    )}
                    {o.source === "agent" && (
                      <span className="rounded-full bg-accent-soft text-accent-ink px-2 py-0.5 text-xs font-bold">☎️ بالتليفون{o.agentName ? ` · ${o.agentName}` : ""}</span>
                    )}
                  </div>
                  <span className="font-extrabold text-xl text-emph">{formatEgp(o.priceSnapshot.total)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[15px]">
                  <Row k="الميعاد" v={`${labelDateArabic(o.scheduledAt)} — ${labelTime(o.scheduledAt)}`} />
                  <Row k="المسافة" v={`${o.km} كم`} />
                  <Row k="الاستلام" v={[o.pickupAddress || "على الخريطة", o.pickupDetails].filter(Boolean).join(" — ")} />
                  <Row k="التسليم" v={[o.dropoffAddress || "على الخريطة", o.dropoffDetails].filter(Boolean).join(" — ")} />
                  {o.cargoType && <Row k="نوع الحمولة" v={o.cargoType} />}
                  {o.loaders > 0 && <Row k="العمالة" v={`${o.loaders} أفراد`} />}
                  <Row k="العميل" v={o.contactName ?? "-"} />
                  <Row k="الموبايل" v={o.contactPhone ?? "-"} ltr />
                  {o.notes && <Row k="ملاحظات العميل" v={o.notes} />}
                  {o.rating != null && <Row k="تقييم العميل" v={`${"⭐".repeat(o.rating)}${o.ratingComment ? ` — ${o.ratingComment}` : ""}`} />}
                </div>

                {o.status === "completed" && <PodView o={o} />}

                {/* Cash handed in by the driver (cash orders only — account orders go on the company statement) */}
                {o.status === "completed" && o.billing === "cash" && (
                  o.cashReceived == null ? (
                    <form action={setOrderCashAction} className="bg-reserved-soft rounded-xl p-3 flex flex-wrap gap-2 items-center">
                      <input type="hidden" name="code" value={o.code} />
                      <span className="font-bold text-sm">💵 الكاش لسه مع السواق — المطلوب {formatEgp(o.priceSnapshot.total)}</span>
                      <input name="amount" type="number" min="0" step="0.5" placeholder={String(piastresToEgp(o.priceSnapshot.total))} className="w-28 rounded-xl border border-line-2 bg-panel px-3 py-1.5" />
                      <button className="rounded-xl bg-ok text-white px-4 py-1.5 font-bold tap">استلمت الكاش</button>
                      <span className="text-xs text-muted w-full">سيب الخانة فاضية لو استلمت المبلغ كامل، أو اكتب اللي استلمته فعلاً.</span>
                    </form>
                  ) : (
                    <form action={setOrderCashAction} className="bg-ok-soft rounded-xl p-3 flex flex-wrap gap-2 items-center">
                      <input type="hidden" name="code" value={o.code} />
                      <input type="hidden" name="undo" value="1" />
                      <span className="font-bold text-sm text-ok">
                        ✅ اتسلّم {formatEgp(o.cashReceived)}
                        {o.cashReceivedAt ? ` — ${labelDateArabic(o.cashReceivedAt)} ${labelTime(o.cashReceivedAt)}` : ""}
                        {o.cashReceivedBy ? ` — ${o.cashReceivedBy}` : ""}
                      </span>
                      {o.cashReceived !== o.priceSnapshot.total && (
                        <span className="text-sm font-bold text-booked">فرق {formatEgp(o.priceSnapshot.total - o.cashReceived)} عن المطلوب</span>
                      )}
                      <button className="rounded-xl text-booked border border-booked-soft px-3 py-1 text-sm font-bold tap">تراجع</button>
                    </form>
                  )
                )}

                {/* Truck size (admin can switch it; price is recomputed) */}
                {o.status !== "completed" && o.status !== "cancelled" && (
                  <form action={changeOrderSizeAction} className="bg-panel-2 rounded-xl p-3 flex flex-wrap gap-2 items-center">
                    <input type="hidden" name="code" value={o.code} />
                    <span className="font-bold text-sm">🚚 حجم العربية:</span>
                    <select key={o.categoryId} name="categoryId" defaultValue={o.categoryId} className="rounded-xl border border-line-2 bg-panel px-3 py-2 flex-1 min-w-40">
                      {!sizes.some((s) => s.id === o.categoryId) && <option value={o.categoryId}>{o.sizeName} (الحالي)</option>}
                      {sizes.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.sizeCode} — {formatEgp(s.baseFare)} + {formatEgp(s.perKm)}/كم
                        </option>
                      ))}
                    </select>
                    <button className="rounded-xl bg-primary-soft text-primary-ink px-4 py-2 font-bold tap">تغيير الحجم</button>
                    <span className="text-xs text-muted w-full">السعر بيتحسب من جديد بنفس المسافة والعمالة، والخصم بيفضل زي ما هو. العميل بيتبلّغ.</span>
                  </form>
                )}

                {/* Driver assignment */}
                <div className="bg-panel-2 rounded-xl p-3 flex flex-col gap-2">
                  <div className="font-bold text-sm">🧑‍✈️ السائق: {o.driverName ?? "لسه متعيّنش"}</div>
                  {!o.driverId && (o.status === "assigned" || o.status === "en_route" || o.status === "arrived") && (
                    <div className="bg-booked-soft text-booked rounded-lg px-3 py-2 text-sm font-bold">
                      ⚠️ الطلب حالته «{STATUS[o.status].label}» بس مفيش سواق متعيّن — اختار سواق ودوس «تعيين» عشان العميل يقدر يكلّمه.
                    </div>
                  )}
                  {o.status !== "completed" && o.status !== "cancelled" && (
                    <form action={assignDeliveryDriver} className="flex gap-2 items-center">
                      <input type="hidden" name="code" value={o.code} />
                      <select key={o.driverId ?? "none"} name="driverId" defaultValue={o.driverId ?? ""} className="rounded-xl border border-line-2 bg-panel px-3 py-2 flex-1">
                        <option value="">— بدون سائق —</option>
                        {drivers.map((d: StaffDTO) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                            {ratings[d.id] ? ` ⭐${ratings[d.id].avg.toFixed(1)}` : ""}
                            {d.available ? "" : " (مش متاح)"}
                          </option>
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
                  {(o.status === "confirmed" || o.status === "assigned" || o.status === "en_route" || o.status === "arrived") && (
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
