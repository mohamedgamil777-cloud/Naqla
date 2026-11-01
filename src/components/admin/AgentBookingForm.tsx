"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { agentCreateBooking, type FormState } from "@/app/admin/actions";
import { PriceBreakdown } from "@/components/ui";
import { cairoDateISO, hourLabel, durationLabel, fullDateLabel } from "@/lib/client-time";
import type { StaffDTO, VehicleListItem } from "@/data/types";
import type { Quote } from "@/engines/pricing";

const inp = "w-full rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-base outline-none focus:border-primary";
const lbl = "block text-sm font-bold text-ink-2 mb-1.5";
type Slot = { hour24: number; startISO: string; status: string };

export function AgentBookingForm({ vehicles, staff }: { vehicles: VehicleListItem[]; staff: StaffDTO[] }) {
  const [state, action] = useActionState<FormState, FormData>(agentCreateBooking, { ok: false });

  const [vehicleId, setVehicleId] = useState("");
  const [date, setDate] = useState(cairoDateISO(0));
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [startISO, setStartISO] = useState("");
  const [durations, setDurations] = useState<number[]>([]);
  const [hours, setHours] = useState<number | "">("");
  const [withDriver, setWithDriver] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const [loaders, setLoaders] = useState(0);
  const [promo, setPromo] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadSlots() {
    if (!vehicleId || !date) return;
    setMsg(null);
    setSlots(null);
    setStartISO("");
    setDurations([]);
    setHours("");
    setQuote(null);
    const r = await fetch(`/api/availability?vehicle=${vehicleId}&date=${date}`);
    const j = await r.json();
    setSlots(j.slots ?? []);
  }

  async function onStart(iso: string) {
    setStartISO(iso);
    setHours("");
    setQuote(null);
    setDurations([]);
    if (!iso) return;
    const r = await fetch(`/api/availability/durations?vehicle=${vehicleId}&start=${encodeURIComponent(iso)}`);
    const j = await r.json();
    setDurations(j.durations ?? []);
    if ((j.durations ?? []).length === 0) setMsg("مفيش مدة متاحة تبدأ من الوقت ده.");
  }

  // Live quote whenever the priced inputs change.
  useEffect(() => {
    if (!vehicleId || !startISO || !hours) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId, startISO, hours, withDriver, withDelivery: delivery, loaders, promoCode: promo || null }),
      });
      const j = await r.json();
      if (!cancelled) setQuote(j.quote ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, startISO, hours, withDriver, delivery, loaders, promo]);

  const available = (slots ?? []).filter((s) => s.status === "available");

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="bg-accent-soft rounded-xl px-4 py-3 text-sm font-semibold text-ink-2">
        📝 الحجز ده هيتسجّل باسم «الموظف» — واضح إنه اتعمل من الإدارة نيابة عن العميل.
      </div>
      {state.error && <div className="bg-booked-soft text-booked rounded-xl px-4 py-3 font-semibold">{state.error}</div>}

      {/* Trip */}
      <fieldset className="bg-panel border border-line rounded-card p-5">
        <legend className="font-extrabold px-2">تفاصيل الرحلة</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <label>
            <span className={lbl}>العربية *</span>
            <select className={inp} name="vehicleId" value={vehicleId} onChange={(e) => { setVehicleId(e.target.value); setSlots(null); setStartISO(""); setHours(""); setQuote(null); }} required>
              <option value="" disabled>اختار العربية</option>
              {vehicles.filter((v) => v.status !== "inactive").map((v) => (
                <option key={v.id} value={v.id}>{v.name} — {v.categoryName}{v.status !== "available" ? " (غير متاحة الآن)" : ""}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className={lbl}>اليوم *</span>
              <input className={inp} type="date" value={date} min={cairoDateISO(0)} max={cairoDateISO(60)} onChange={(e) => setDate(e.target.value)} />
            </label>
            <button type="button" onClick={loadSlots} disabled={!vehicleId} className="rounded-xl px-4 py-2.5 font-bold bg-primary text-white disabled:opacity-40 whitespace-nowrap">اعرض المواعيد</button>
          </div>

          {slots && (
            <label>
              <span className={lbl}>ميعاد الاستلام *</span>
              <select className={inp} name="startISO" value={startISO} onChange={(e) => onStart(e.target.value)} required>
                <option value="" disabled>اختار الوقت</option>
                {available.map((s) => (
                  <option key={s.hour24} value={s.startISO}>{hourLabel(s.hour24)}</option>
                ))}
              </select>
              {available.length === 0 && <span className="block mt-1 text-sm text-booked">مفيش مواعيد متاحة في اليوم ده.</span>}
            </label>
          )}

          {durations.length > 0 && (
            <label>
              <span className={lbl}>مدة الإيجار *</span>
              <select className={inp} name="hours" value={hours} onChange={(e) => setHours(Number(e.target.value))} required>
                <option value="" disabled>اختار المدة</option>
                {durations.map((d) => (
                  <option key={d} value={d}>{durationLabel(d)}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        {msg && <p className="text-booked text-sm font-semibold mt-2">{msg}</p>}
      </fieldset>

      {/* Options */}
      <fieldset className="bg-panel border border-line rounded-card p-5">
        <legend className="font-extrabold px-2">الإضافات</legend>
        <div className="flex flex-wrap items-center gap-5 mt-2">
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" name="withDriver" checked={withDriver} onChange={(e) => setWithDriver(e.target.checked)} className="w-5 h-5" /> مع سائق
          </label>
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" name="withDelivery" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} className="w-5 h-5" /> توصيل
          </label>
          <label className="flex items-center gap-2 font-semibold">
            العمالة:
            <input type="number" name="loaders" min="0" max="6" value={loaders} onChange={(e) => setLoaders(Number(e.target.value) || 0)} className="w-20 rounded-xl border border-line-2 bg-panel px-3 py-2" />
          </label>
          <label className="flex items-center gap-2 font-semibold">
            كود خصم:
            <input name="promoCode" value={promo} onChange={(e) => setPromo(e.target.value)} className="w-32 rounded-xl border border-line-2 bg-panel px-3 py-2" />
          </label>
        </div>
      </fieldset>

      {/* Customer + agent */}
      <fieldset className="bg-panel border border-line rounded-card p-5">
        <legend className="font-extrabold px-2">بيانات العميل</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <label><span className={lbl}>اسم العميل *</span><input className={inp} name="contactName" required /></label>
          <label><span className={lbl}>موبايل العميل *</span><input className={inp} name="contactPhone" inputMode="tel" dir="ltr" placeholder="01xxxxxxxxx" required /></label>
          <label>
            <span className={lbl}>الموظف المسؤول</span>
            <select className={inp} name="agentName" defaultValue={staff[0]?.name ?? ""}>
              {staff.length === 0 && <option value="">—</option>}
              {staff.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      {/* Live price */}
      {quote && (
        <div>
          <div className="text-sm text-muted mb-2">
            {startISO && `${fullDateLabel(date)} · ${hours ? durationLabel(Number(hours)) : ""}`}
          </div>
          <PriceBreakdown quote={quote} />
        </div>
      )}

      <SubmitBtn disabled={!vehicleId || !startISO || !hours} />
    </form>
  );
}

function SubmitBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="rounded-2xl px-6 py-3.5 font-bold bg-accent text-on-accent disabled:opacity-40 self-start">
      {pending ? "بيحجز…" : "احجز للعميل"}
    </button>
  );
}
