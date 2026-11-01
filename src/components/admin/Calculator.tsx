"use client";
import { useEffect, useState } from "react";
import { PriceBreakdown } from "@/components/ui";
import type { VehicleListItem } from "@/data/types";
import type { Quote } from "@/engines/pricing";

const inp = "w-full rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary";
const lbl = "block text-sm font-bold text-ink-2 mb-1.5";

export function Calculator({ vehicles }: { vehicles: VehicleListItem[] }) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [hours, setHours] = useState(2);
  const [km, setKm] = useState(0);
  const [withDriver, setWithDriver] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const [loaders, setLoaders] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId || hours <= 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setErr(null);
      const r = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          startISO: new Date().toISOString(),
          hours,
          km,
          withDriver,
          withDelivery: delivery,
          loaders,
        }),
      });
      const j = await r.json();
      if (cancelled) return;
      if (j.quote) setQuote(j.quote);
      else {
        setQuote(null);
        setErr(j.error === "BELOW_MIN_HOURS" ? "أقل مدة إيجار مسموحة أعلى من كده." : "مش قادر يحسب، راجع البيانات.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, hours, km, withDriver, delivery, loaders]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-panel border border-line rounded-card p-5 flex flex-col gap-4">
        <label>
          <span className={lbl}>العربية</span>
          <select className={inp} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.name} — {v.categoryName}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className={lbl}>المدة (ساعات)</span>
            <input className={inp} type="number" min="1" value={hours} onChange={(e) => setHours(Number(e.target.value) || 0)} />
          </label>
          <label>
            <span className={lbl}>المسافة (كيلومتر)</span>
            <input className={inp} type="number" min="0" value={km} onChange={(e) => setKm(Number(e.target.value) || 0)} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={withDriver} onChange={(e) => setWithDriver(e.target.checked)} className="w-5 h-5" /> مع سائق
          </label>
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} className="w-5 h-5" /> توصيل
          </label>
          <label className="flex items-center gap-2 font-semibold">
            العمالة:
            <input type="number" min="0" max="6" value={loaders} onChange={(e) => setLoaders(Number(e.target.value) || 0)} className="w-20 rounded-xl border border-line-2 bg-panel px-3 py-2" />
          </label>
        </div>
        <p className="text-sm text-muted">الحاسبة بتجمع سعر الوقت (حسب أسعار العربية) + سعر المسافة (سعر الكيلومتر) + الإضافات.</p>
      </div>

      <div>
        {err && <div className="bg-booked-soft text-booked rounded-xl px-4 py-3 font-semibold mb-3">{err}</div>}
        {quote ? (
          <PriceBreakdown quote={quote} />
        ) : (
          <div className="bg-panel border border-line rounded-card p-8 text-center text-muted">اكتب البيانات على الشمال يظهرلك السعر.</div>
        )}
      </div>
    </div>
  );
}
