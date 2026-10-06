"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VehicleImage } from "./VehicleImage";
import { Button } from "./ui";
import { PriceBreakdown, inputClass } from "./ui";
import { cairoDateISO, dayLabel, fullDateLabel, hourLabel, durationLabel } from "@/lib/client-time";
import { formatEgp } from "@/lib/money";
import { KIND_LABEL, type VehicleKind } from "@/lib/constants";
import type { VehicleListItem } from "@/data/types";
import type { Quote } from "@/engines/pricing";

type Step = "kind" | "vehicle" | "when" | "time" | "duration" | "place" | "review";
type SlotDTO = { hour24: number; startISO: string; status: "available" | "booked" | "unavailable" };
type Alt = { startISO: string; startLabel: string };

const STEPS_LABELS = ["العربية", "الوقت", "المدة", "المكان", "المراجعة"];
function stepIndex(s: Step): number {
  if (s === "kind" || s === "vehicle") return 0;
  if (s === "when" || s === "time") return 1;
  if (s === "duration") return 2;
  if (s === "place") return 3;
  return 4;
}

export function BookingWizard({
  vehicles,
  initialKind,
  initialVehicleId,
  isAuthed,
  initialName = "",
}: {
  vehicles: VehicleListItem[];
  initialKind?: VehicleKind;
  initialVehicleId?: string;
  isAuthed: boolean;
  initialName?: string;
}) {
  const router = useRouter();
  const initialVehicle = vehicles.find((v) => v.id === initialVehicleId);
  const [step, setStep] = useState<Step>(
    initialVehicle ? "when" : initialKind ? "vehicle" : "kind"
  );
  const [kind, setKind] = useState<VehicleKind | undefined>(initialVehicle?.kind ?? initialKind);
  const [vehicleId, setVehicleId] = useState<string | undefined>(initialVehicleId);
  const [dayOffset, setDayOffset] = useState<number | null>(null);
  const [dateISO, setDateISO] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotDTO[] | null>(null);
  const [startISO, setStartISO] = useState<string | null>(null);
  const [startHour, setStartHour] = useState<number | null>(null);
  const [durations, setDurations] = useState<number[] | null>(null);
  const [hours, setHours] = useState<number | null>(null);
  const [place, setPlace] = useState<"branch" | "delivery">("branch");
  const [withDriver, setWithDriver] = useState(false);
  const [loaders, setLoaders] = useState(0);
  const [addr, setAddr] = useState({ area: "", street: "", building: "", floor: "", apt: "", landmark: "" });
  const [promo, setPromo] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [alts, setAlts] = useState<Alt[] | null>(null);

  // auth (inline at review)
  const [authed, setAuthed] = useState(isAuthed);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [devHint, setDevHint] = useState<string | null>(null);

  const selected = useMemo(() => vehicles.find((v) => v.id === vehicleId), [vehicles, vehicleId]);
  const filtered = useMemo(() => vehicles.filter((v) => (kind ? v.kind === kind : true)), [vehicles, kind]);

  // The first reachable step depends on how the customer entered the wizard.
  const entryStep: Step = initialVehicle ? "when" : initialKind ? "vehicle" : "kind";
  function goBack() {
    setErr(null);
    setAlts(null);
    const order: Step[] = ["kind", "vehicle", "when", "time", "duration", "place", "review"];
    if (step === entryStep) {
      router.push("/");
      return;
    }
    const i = order.indexOf(step);
    if (i > 0) setStep(order[i - 1]);
    else router.push("/");
  }

  async function loadSlots(vId: string, date: string) {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/availability?vehicle=${vId}&date=${date}`);
      const j = await r.json();
      setSlots(j.slots ?? []);
    } catch {
      setErr("مشكلة في تحميل المواعيد، حاول تاني.");
    } finally {
      setLoading(false);
    }
  }

  async function chooseDay(offset: number | null, explicitDate?: string) {
    const date = explicitDate ?? cairoDateISO(offset ?? 0);
    setDayOffset(offset);
    setDateISO(date);
    setStartISO(null);
    setDurations(null);
    setHours(null);
    setStep("time");
    if (vehicleId) await loadSlots(vehicleId, date);
  }

  async function chooseSlot(s: SlotDTO) {
    setStartISO(s.startISO);
    setStartHour(s.hour24);
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/availability/durations?vehicle=${vehicleId}&start=${encodeURIComponent(s.startISO)}`);
      const j = await r.json();
      const ds: number[] = j.durations ?? [];
      setDurations(ds);
      if (ds.length === 0) setErr("مفيش مدة متاحة تبدأ من الوقت ده، اختار وقت تاني.");
      else setStep("duration");
    } catch {
      setErr("مشكلة في تحميل المدد، حاول تاني.");
    } finally {
      setLoading(false);
    }
  }

  async function loadQuote() {
    if (!vehicleId || !startISO || !hours) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          startISO,
          hours,
          withDriver,
          withDelivery: place === "delivery",
          loaders,
          promoCode: promo || null,
        }),
      });
      const j = await r.json();
      if (j.error === "INVALID_PROMO") {
        setErr("كود الخصم مش صحيح أو مش متاح.");
        // reload without promo
        setPromo("");
      } else if (j.quote) {
        setQuote(j.quote);
        setErr(null);
      }
    } catch {
      setErr("مشكلة في حساب السعر، حاول تاني.");
    } finally {
      setLoading(false);
    }
  }

  async function goReview() {
    setStep("review");
    await loadQuote();
  }

  async function sendOtp() {
    setErr(null);
    const r = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const j = await r.json();
    if (j.ok) {
      setOtpSent(true);
      if (j.devCode) {
        setOtp(j.devCode);
        setDevHint(`وضع تجربة: كودك هو ${j.devCode} — دوسّ «تأكيد».`);
      } else {
        setDevHint("تم إرسال كود على موبايلك.");
      }
    } else {
      setErr(j.error === "INVALID_PHONE" ? "رقم الموبايل مش صحيح." : "مشكلة في الإرسال.");
    }
  }

  async function verifyOtp() {
    setErr(null);
    const r = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code: otp, name }),
    });
    const j = await r.json();
    if (j.ok) setAuthed(true);
    else setErr("الكود مش صحيح، حاول تاني.");
  }

  async function submit() {
    if (!vehicleId || !startISO || !hours || !name.trim()) {
      setErr("اكتب اسمك الأول.");
      return;
    }
    setLoading(true);
    setErr(null);
    setAlts(null);
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          startISO,
          hours,
          withDriver,
          withDelivery: place === "delivery",
          loaders,
          deliveryAddress: place === "delivery" ? addr : null,
          promoCode: promo || null,
          contactName: name,
        }),
      });
      const j = await r.json();
      if (r.ok && j.code) {
        router.push(`/confirm/${j.code}`);
      } else if (r.status === 409) {
        setErr("العربية دي مش متاحة في الوقت ده. جرب ميعاد تاني 👇");
        setAlts(j.alternatives ?? []);
      } else if (r.status === 401) {
        setAuthed(false);
        setErr("محتاج تأكيد رقم موبايلك الأول.");
      } else {
        setErr("مشكلة في الحجز، حاول تاني.");
      }
    } catch {
      setErr("مشكلة في الاتصال، حاول تاني.");
    } finally {
      setLoading(false);
    }
  }

  function pickAlt(a: Alt) {
    // Jump back: set start to the alternative, re-fetch durations.
    setStartISO(a.startISO);
    setAlts(null);
    setErr(null);
    setStep("duration");
    fetch(`/api/availability/durations?vehicle=${vehicleId}&start=${encodeURIComponent(a.startISO)}`)
      .then((r) => r.json())
      .then((j) => setDurations(j.durations ?? []));
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <Stepper current={stepIndex(step)} />
      <ChosenSummary
        vehicle={selected}
        kind={kind}
        dateISO={dateISO}
        startHour={startHour}
        hours={hours}
        place={place}
      />

      {err && (
        <div className="bg-booked-soft text-booked rounded-2xl px-4 py-3 font-semibold">{err}</div>
      )}

      {/* STEP: kind */}
      {step === "kind" && (
        <StepCard title="محتاج نوع إيه؟" onBack={goBack}>
          <div className="grid grid-cols-2 gap-3">
            <BigChoice icon="🚚" label="بيك أب" onClick={() => { setKind("pickup"); setStep("vehicle"); }} />
            <BigChoice icon="🚐" label="فان" onClick={() => { setKind("van"); setStep("vehicle"); }} />
          </div>
        </StepCard>
      )}

      {/* STEP: vehicle */}
      {step === "vehicle" && (
        <StepCard title="اختار العربية" onBack={goBack}>
          <div className="flex flex-col gap-3">
            {filtered.map((v) => (
              <button
                key={v.id}
                onClick={() => { setVehicleId(v.id); setKind(v.kind); chooseDay(0); }}
                disabled={v.status !== "available"}
                className="tap flex items-center gap-3 bg-panel border-2 border-line-2 rounded-2xl p-3 text-start disabled:opacity-40 enabled:hover:border-primary"
              >
                <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-panel-2 shrink-0">
                  <VehicleImage src={v.primaryImage} alt={v.name} sizes="96px" />
                </div>
                <div className="flex-1">
                  <div className="font-extrabold">{v.name}</div>
                  <div className="text-emph font-bold">
                    {formatEgp(v.fromHourlyPiastres, { withUnit: false })} <span className="text-muted text-sm font-normal">جنيه/ساعة</span>
                  </div>
                </div>
                <span className="text-2xl text-primary" aria-hidden>‹</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-muted text-center py-6">مفيش عربيات من النوع ده حالياً.</p>}
          </div>
        </StepCard>
      )}

      {/* STEP: when */}
      {step === "when" && (
        <StepCard title="هتحتاجها إمتى؟" onBack={goBack}>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((o) => (
              <BigChoice key={o} label={dayLabel(o)} onClick={() => chooseDay(o)} />
            ))}
          </div>
          <label className="block mt-3">
            <span className="block mb-2 font-bold">أو اختار يوم</span>
            <input
              type="date"
              min={cairoDateISO(0)}
              max={cairoDateISO(30)}
              className={inputClass}
              onChange={(e) => e.target.value && chooseDay(null, e.target.value)}
            />
          </label>
        </StepCard>
      )}

      {/* STEP: time */}
      {step === "time" && (
        <StepCard title="اختار الوقت" onBack={goBack}>
          {loading && <p className="text-muted text-center py-6">بنحمّل المواعيد…</p>}
          {slots && (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                {slots.map((s) => {
                  const selectable = s.status === "available";
                  const cls =
                    s.status === "available"
                      ? "bg-panel border-2 border-line-2 hover:border-primary"
                      : s.status === "booked"
                      ? "bg-booked-soft text-booked border-2 border-transparent"
                      : "bg-off-soft text-off border-2 border-transparent";
                  return (
                    <button
                      key={s.hour24}
                      disabled={!selectable}
                      onClick={() => chooseSlot(s)}
                      className={`tap rounded-xl py-3 font-bold text-center disabled:cursor-not-allowed ${cls}`}
                    >
                      {hourLabel(s.hour24)}
                      <span className="block text-xs font-normal mt-0.5">
                        {s.status === "available" ? "🟢 متاح" : s.status === "booked" ? "🔴 محجوز" : "⚪ مش متاح"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {slots.every((s) => s.status !== "available") && (
                <p className="text-muted text-center mt-4">مفيش مواعيد متاحة في اليوم ده، جرب يوم تاني.</p>
              )}
            </>
          )}
        </StepCard>
      )}

      {/* STEP: duration */}
      {step === "duration" && durations && (
        <StepCard title="هتحتاجها كام ساعة؟" onBack={goBack}>
          <div className="grid grid-cols-2 gap-3">
            {durations.map((d) => (
              <BigChoice key={d} label={durationLabel(d)} onClick={() => { setHours(d); setStep("place"); }} />
            ))}
          </div>
        </StepCard>
      )}

      {/* STEP: place */}
      {step === "place" && (
        <StepCard title="هتستلم العربية منين؟" onBack={goBack}>
          <div className="grid grid-cols-2 gap-3">
            <BigChoice label="من الفرع" active={place === "branch"} onClick={() => setPlace("branch")} icon="🏢" />
            <BigChoice label="توصيل لعندي" active={place === "delivery"} onClick={() => setPlace("delivery")} icon="📍" />
          </div>

          {place === "delivery" && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <input className={inputClass} placeholder="المنطقة" value={addr.area} onChange={(e) => setAddr({ ...addr, area: e.target.value })} />
              <input className={inputClass} placeholder="الشارع" value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} />
              <input className={inputClass} placeholder="العمارة" value={addr.building} onChange={(e) => setAddr({ ...addr, building: e.target.value })} />
              <input className={inputClass} placeholder="الدور" value={addr.floor} onChange={(e) => setAddr({ ...addr, floor: e.target.value })} />
              <input className={`${inputClass} col-span-2`} placeholder="علامة مميزة (اختياري)" value={addr.landmark} onChange={(e) => setAddr({ ...addr, landmark: e.target.value })} />
            </div>
          )}

          {selected?.status === "available" && (
            <div className="mt-5">
              <span className="block mb-2 font-bold">عايز العربية بس ولا مع سائق؟</span>
              <div className="grid grid-cols-2 gap-3">
                <BigChoice label="العربية فقط" active={!withDriver} onClick={() => setWithDriver(false)} />
                <BigChoice label="العربية + سائق" active={withDriver} onClick={() => setWithDriver(true)} />
              </div>
            </div>
          )}

          {/* Loaders / عمالة add-on (inspired by common Egyptian moving needs) */}
          <div className="mt-5">
            <span className="block mb-2 font-bold">محتاج عمالة للتحميل والتنزيل؟</span>
            <div className="flex items-center justify-between bg-panel border-2 border-line-2 rounded-2xl p-2">
              <button
                type="button"
                onClick={() => setLoaders((n) => Math.max(0, n - 1))}
                className="tap w-12 h-12 rounded-xl bg-panel-2 text-2xl font-extrabold disabled:opacity-40"
                disabled={loaders === 0}
                aria-label="أقل"
              >
                −
              </button>
              <div className="text-center">
                <div className="text-2xl font-extrabold">{loaders === 0 ? "بدون" : loaders}</div>
                <div className="text-xs text-muted">{loaders === 0 ? "من غير عمالة" : loaders === 1 ? "فرد واحد" : "أفراد"}</div>
              </div>
              <button
                type="button"
                onClick={() => setLoaders((n) => Math.min(6, n + 1))}
                className="tap w-12 h-12 rounded-xl bg-primary text-white text-2xl font-extrabold disabled:opacity-40"
                disabled={loaders === 6}
                aria-label="أكتر"
              >
                +
              </button>
            </div>
          </div>

          <Button full className="mt-5" onClick={goReview}>راجع الحجز</Button>
        </StepCard>
      )}

      {/* STEP: review */}
      {step === "review" && (
        <StepCard title="مراجعة الحجز" onBack={goBack}>
          {loading && !quote && <p className="text-muted text-center py-6">بنحسب السعر…</p>}
          {quote && (
            <div className="flex flex-col gap-4">
              <div className="bg-panel-2 rounded-2xl p-4 text-[15px] flex flex-col gap-1.5">
                <Row k="العربية" v={selected?.name ?? ""} />
                <Row k="اليوم" v={dateISO ? fullDateLabel(dateISO) : ""} />
                <Row k="الوقت" v={startHour != null ? `${hourLabel(startHour)}` : ""} />
                <Row k="المدة" v={hours ? durationLabel(hours) : ""} />
                <Row k="الاستلام" v={place === "branch" ? `من ${selected?.branchName}` : "توصيل لعندك"} />
                <Row k="السائق" v={withDriver ? "مع سائق" : "بدون سائق"} />
                <Row k="العمالة" v={loaders === 0 ? "بدون" : `${loaders} ${loaders === 1 ? "فرد" : "أفراد"}`} />
              </div>

              <div className="flex gap-2">
                <input className={inputClass} placeholder="كود خصم (اختياري)" value={promo} onChange={(e) => setPromo(e.target.value)} />
                <Button variant="secondary" onClick={loadQuote} className="!px-4">تطبيق</Button>
              </div>

              <PriceBreakdown quote={quote} />

              {/* auth + name */}
              <div className="flex flex-col gap-3 border-t border-line pt-4">
                <input className={inputClass} placeholder="اسمك" value={name} onChange={(e) => setName(e.target.value)} />
                {!authed && (
                  <>
                    <div className="flex gap-2">
                      <input className={inputClass} inputMode="tel" placeholder="رقم الموبايل" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      <Button variant="secondary" onClick={sendOtp} className="!px-4 whitespace-nowrap">إرسال الكود</Button>
                    </div>
                    {otpSent && (
                      <div className="flex gap-2">
                        <input className={inputClass} inputMode="numeric" placeholder="الكود" value={otp} onChange={(e) => setOtp(e.target.value)} />
                        <Button variant="secondary" onClick={verifyOtp} className="!px-4">تأكيد</Button>
                      </div>
                    )}
                    {devHint && <p className="text-sm text-muted">{devHint}</p>}
                  </>
                )}
              </div>

              {alts && alts.length > 0 && (
                <div className="bg-accent-soft rounded-2xl p-3">
                  <p className="font-bold mb-2">أقرب مواعيد متاحة:</p>
                  <div className="flex flex-col gap-2">
                    {alts.map((a) => (
                      <button key={a.startISO} onClick={() => pickAlt(a)} className="tap bg-panel border-2 border-line-2 rounded-xl py-2.5 font-semibold hover:border-primary">
                        {a.startLabel}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="accent" full disabled={loading || !authed || !name.trim()} onClick={submit}>
                {loading ? "لحظة…" : "تأكيد الحجز"}
              </Button>
              {!authed && <p className="text-center text-sm text-muted">أكّد رقم موبايلك عشان تكمل الحجز</p>}
            </div>
          )}
        </StepCard>
      )}
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEPS_LABELS.map((l, i) => (
        <div key={l} className="flex-1 flex flex-col items-center gap-1">
          <div className={`h-1.5 w-full rounded-full ${i <= current ? "bg-primary" : "bg-line-2"}`} />
          <span className={`text-[11px] font-semibold ${i === current ? "text-emph" : "text-muted"}`}>{l}</span>
        </div>
      ))}
    </div>
  );
}

function ChosenSummary({
  vehicle, kind, dateISO, startHour, hours, place,
}: {
  vehicle?: VehicleListItem; kind?: VehicleKind; dateISO: string | null; startHour: number | null; hours: number | null; place: string;
}) {
  const chips: string[] = [];
  if (vehicle) chips.push(vehicle.name);
  else if (kind) chips.push(KIND_LABEL[kind]);
  if (dateISO) chips.push(fullDateLabel(dateISO));
  if (startHour != null) chips.push(hourLabel(startHour));
  if (hours) chips.push(durationLabel(hours));
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c, i) => (
        <span key={i} className="bg-primary-soft text-primary-ink rounded-full px-3 py-1 text-sm font-semibold">{c}</span>
      ))}
    </div>
  );
}

function StepCard({ title, children, onBack }: { title: string; children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="bg-panel border border-line rounded-card p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="رجوع"
          className="tap w-11 h-11 rounded-full bg-panel-2 grid place-items-center text-2xl font-extrabold text-primary shrink-0 hover:bg-primary-soft"
        >
          →
        </button>
        <h2 className="text-xl font-extrabold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function BigChoice({ icon, label, onClick, active }: { icon?: string; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`tap rounded-2xl py-4 px-3 font-extrabold text-lg flex flex-col items-center gap-1.5 border-2 transition ${
        active ? "border-primary bg-primary-soft text-primary-ink" : "border-line-2 bg-panel hover:border-primary"
      }`}
    >
      {icon && <span className="text-3xl" aria-hidden>{icon}</span>}
      {label}
    </button>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
