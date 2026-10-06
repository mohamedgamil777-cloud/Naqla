"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { PriceBreakdown } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icons";
import { cairoDateISO } from "@/lib/client-time";
import { formatEgp } from "@/lib/money";
import type { Quote } from "@/engines/pricing";

interface SizeOpt {
  id: string;
  name: string;
  sizeCode: string;
  capacityKg: number | null;
  dims: string | null;
  description: string | null;
  image: string | null;
}
interface LatLng {
  lat: number;
  lng: number;
}

/** Quick "what are you moving?" cards → recommended size. */
const CARGO_HINTS: { label: string; size: string; icon: IconName }[] = [
  { label: "ظرف / أوراق", size: "XS", icon: "file" },
  { label: "صناديق / كراسي", size: "S", icon: "box" },
  { label: "أثاث / أجهزة", size: "M", icon: "sofa" },
  { label: "عفش بيت", size: "L", icon: "home" },
];

const SIZE_BADGE: Record<string, string> = {
  XS: "bg-accent-soft text-accent-ink",
  S: "bg-primary-soft text-primary-ink",
  M: "bg-panel-2 text-ink-2",
  L: "bg-panel-2 text-ink-2",
};

const STEPS = [
  { id: "sec-places", label: "الأماكن" },
  { id: "sec-time", label: "الميعاد" },
  { id: "sec-vehicle", label: "العربية" },
  { id: "sec-details", label: "التفاصيل" },
];

/** 07:00 → 22:00 every 30 min. */
const TIME_SLOTS = Array.from({ length: 31 }, (_, i) => {
  const mins = 7 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

function timeLabel(t: string) {
  const [h, m] = t.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { clock: `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")}`, part: h < 12 ? "صباحاً" : "مساءً" };
}
function dateLabel(iso: string) {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function capacityLabel(kg: number) {
  return `حتى ${kg.toLocaleString("en-US")} كجم`;
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function roadKm(a: LatLng, b: LatLng): number {
  return Math.round(haversineKm(a, b) * 1.3 * 10) / 10;
}

function loadLeaflet(): Promise<any> {
  if ((window as any).L) return Promise.resolve((window as any).L);
  return new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const css = document.createElement("link");
      css.id = "leaflet-css";
      css.rel = "stylesheet";
      css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(css);
    }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    s.onload = () => resolve((window as any).L);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
/** Round map pin: red for pickup, teal flag for drop-off (matches the location card). */
function pinIcon(L: any, kind: "a" | "b") {
  const bg = kind === "a" ? "#d9452b" : "#135f5a";
  const glyph =
    kind === "a"
      ? '<circle cx="12" cy="10" r="3" fill="#fff"/>'
      : '<path d="M8 17V6s1-1 3-1 3 1.5 5 1.5 2-.5 2-.5v6s-.5.5-2 .5-3-1.5-5-1.5-3 1-3 1" fill="#fff"/>';
  return L.divIcon({
    className: "",
    html: `<svg width="34" height="42" viewBox="0 0 24 30" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))"><path d="M12 29s9-8.6 9-17A9 9 0 0 0 3 12c0 8.4 9 17 9 17z" fill="${bg}"/>${glyph}</svg>`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
  });
}

export function DeliveryEstimator({
  sizes,
  center,
  initialSizeCode,
  loaderFee,
}: {
  sizes: SizeOpt[];
  center: LatLng;
  initialSizeCode?: string;
  /** per-person loader fee (piastres), shown under the counter */
  loaderFee?: number;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ a: any; b: any }>({ a: null, b: null });
  const [mapOpen, setMapOpen] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [active, setActive] = useState<"a" | "b">("a");
  const activeRef = useRef<"a" | "b">("a");
  activeRef.current = active;

  const [pickup, setPickup] = useState<LatLng>({ lat: center.lat + 0.008, lng: center.lng - 0.008 });
  const [dropoff, setDropoff] = useState<LatLng>({ lat: center.lat - 0.008, lng: center.lng + 0.008 });
  const [pickupAddr, setPickupAddr] = useState("");
  const [dropoffAddr, setDropoffAddr] = useState("");
  const [km, setKm] = useState(() => roadKm({ lat: center.lat + 0.008, lng: center.lng - 0.008 }, { lat: center.lat - 0.008, lng: center.lng + 0.008 }));
  const [editKm, setEditKm] = useState(false);
  const [locating, setLocating] = useState(false);

  const [sizeId, setSizeId] = useState(
    () => (sizes.find((s) => s.sizeCode === initialSizeCode) ?? sizes.find((s) => s.sizeCode === "S") ?? sizes[0])?.id ?? ""
  );
  const [recommended, setRecommended] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [vehicleTouched, setVehicleTouched] = useState(Boolean(initialSizeCode));
  const [compareOpen, setCompareOpen] = useState(false);

  const today = cairoDateISO(0);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");
  const [timeTouched, setTimeTouched] = useState(false);

  const [loaders, setLoaders] = useState(0);
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pricing, setPricing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [orderErr, setOrderErr] = useState<string | null>(null);

  // ---- map (lazy: built the first time it's opened) ----
  useEffect(() => {
    if (!mapOpen) return;
    if (mapRef.current) {
      setTimeout(() => mapRef.current.invalidateSize(), 50);
      return;
    }
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapEl.current || mapRef.current) return;
        const map = L.map(mapEl.current).setView([center.lat, center.lng], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap", maxZoom: 19 }).addTo(map);
        const a = L.marker([pickup.lat, pickup.lng], { draggable: true, icon: pinIcon(L, "a") }).addTo(map);
        const b = L.marker([dropoff.lat, dropoff.lng], { draggable: true, icon: pinIcon(L, "b") }).addTo(map);
        markersRef.current = { a, b };
        a.on("dragend", () => { const p = a.getLatLng(); setPickup({ lat: p.lat, lng: p.lng }); });
        b.on("dragend", () => { const p = b.getLatLng(); setDropoff({ lat: p.lat, lng: p.lng }); });
        map.on("click", (e: any) => {
          const ll = { lat: e.latlng.lat, lng: e.latlng.lng };
          if (activeRef.current === "a") { a.setLatLng(e.latlng); setPickup(ll); }
          else { b.setLatLng(e.latlng); setDropoff(ll); }
        });
        mapRef.current = map;
      })
      .catch(() => setMapError(true));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapOpen]);

  useEffect(() => {
    setKm(roadKm(pickup, dropoff));
  }, [pickup, dropoff]);

  // ---- live price: re-quote whenever an input changes (debounced) ----
  useEffect(() => {
    if (!sizeId) return;
    let cancelled = false;
    setPricing(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId: sizeId, km, loaders, promoCode: appliedPromo || null }),
        });
        const j = await r.json();
        if (cancelled) return;
        if (j.quote) setQuote(j.quote);
        if (appliedPromo) {
          setPromoMsg(j.promoApplied ? { ok: true, text: "تم تطبيق الكوبون" } : { ok: false, text: "الكوبون مش صحيح أو مش مطابق للشروط" });
        }
      } finally {
        if (!cancelled) setPricing(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [sizeId, km, loaders, appliedPromo]);

  function pickHint(size: string) {
    setHint(size);
    const match = sizes.find((s) => s.sizeCode === size);
    if (match) {
      setSizeId(match.id);
      setRecommended(match.id);
      setVehicleTouched(true);
    }
  }

  function swap() {
    setPickup(dropoff);
    setDropoff(pickup);
    setPickupAddr(dropoffAddr);
    setDropoffAddr(pickupAddr);
    const { a, b } = markersRef.current;
    if (a && b) { a.setLatLng([dropoff.lat, dropoff.lng]); b.setLatLng([pickup.lat, pickup.lng]); }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPickup(ll);
        markersRef.current.a?.setLatLng([ll.lat, ll.lng]);
        mapRef.current?.setView([ll.lat, ll.lng], 14);
        if (!pickupAddr.trim()) setPickupAddr("موقعي الحالي");
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function goTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function placeOrder() {
    if (!sizeId) return;
    if (!pickupAddr.trim() || !dropoffAddr.trim()) {
      setOrderErr("اكتب عنوان الاستلام والتسليم عشان السواق يعرف المكان بالظبط.");
      goTo("sec-places");
      return;
    }
    setOrdering(true);
    setOrderErr(null);
    try {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: sizeId,
          km,
          loaders,
          promoCode: appliedPromo || null,
          pickupAddress: pickupAddr || null,
          dropoffAddress: dropoffAddr || null,
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          dropoffLat: dropoff.lat,
          dropoffLng: dropoff.lng,
          date,
          time,
        }),
      });
      if (r.status === 401) {
        window.location.href = "/login?next=/estimate";
        return;
      }
      const j = await r.json();
      if (j.code) setOrderCode(j.code);
      else if (j.error === "PAST") { setOrderErr("اختار ميعاد في المستقبل."); goTo("sec-time"); }
      else setOrderErr("حصلت مشكلة، حاول تاني.");
    } catch {
      setOrderErr("حصلت مشكلة، حاول تاني.");
    } finally {
      setOrdering(false);
    }
  }

  if (orderCode) {
    return (
      <div className="bg-panel border border-line rounded-card p-8 text-center flex flex-col items-center gap-3 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-ok-soft text-ok grid place-items-center">
          <Icon name="check" className="w-9 h-9" strokeWidth={2.6} />
        </div>
        <h2 className="text-2xl font-extrabold">تم استلام طلبك!</h2>
        <p className="text-ink-2 font-semibold">رقم الطلب: <span dir="ltr">#{orderCode}</span></p>
        <p className="text-muted">هنتواصل معاك على موبايلك لتأكيد الميعاد والسواق.</p>
        <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
          <a href="/bookings" className="tap rounded-2xl bg-primary text-white px-6 py-3 font-bold grid place-items-center">تابع طلبك</a>
          <a href="/" className="tap rounded-2xl border-2 border-line-2 text-ink px-6 py-3 font-bold grid place-items-center">تمام</a>
        </div>
      </div>
    );
  }

  // progress: first unfinished section is the current step
  const done = [Boolean(pickupAddr.trim() && dropoffAddr.trim()), timeTouched, vehicleTouched, false];
  const current = done.findIndex((d) => !d);

  return (
    <div className="flex flex-col gap-4">
      {/* Stepper */}
      <ol className="grid grid-cols-4 relative mb-1">
        <span className="absolute top-[18px] right-[12.5%] left-[12.5%] h-0.5 bg-line-2" aria-hidden />
        {STEPS.map((s, i) => {
          const isDone = done[i] && i !== current;
          const isCur = i === current;
          return (
            <li key={s.id} className="relative flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => goTo(s.id)}
                aria-current={isCur ? "step" : undefined}
                className={`w-9 h-9 rounded-full grid place-items-center font-extrabold border-2 ${
                  isCur ? "bg-primary border-primary text-white" : isDone ? "bg-primary-soft border-primary text-primary" : "bg-panel-2 border-line-2 text-muted"
                }`}
              >
                {isDone ? <Icon name="check" className="w-4 h-4" strokeWidth={3} /> : i + 1}
              </button>
              <span className={`text-sm ${isCur ? "text-primary font-extrabold" : "text-muted font-semibold"}`}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      {/* Places */}
      <section id="sec-places" className="scroll-mt-20 bg-panel border border-line rounded-card shadow-sm overflow-hidden">
        <div className="relative">
          {/* pickup */}
          <div className="flex items-center gap-3 p-4 pb-3">
            <span className="w-11 h-11 shrink-0 rounded-full bg-booked-soft text-booked grid place-items-center">
              <Icon name="mapPin" className="w-6 h-6" />
            </span>
            <label className="flex-1 min-w-0">
              <span className="block font-extrabold">مكان الاستلام</span>
              <input
                value={pickupAddr}
                onChange={(e) => setPickupAddr(e.target.value)}
                onFocus={() => setActive("a")}
                placeholder="العنوان بالتفصيل"
                className="w-full bg-transparent text-ink-2 placeholder:text-muted/70 outline-none py-0.5"
              />
            </label>
            <button type="button" onClick={useMyLocation} disabled={locating} className="shrink-0 flex items-center gap-1.5 text-sm font-bold text-primary rounded-full border border-line px-2.5 py-1.5 hover:bg-primary-soft disabled:opacity-50">
              <Icon name="locate" className="w-4 h-4" />
              {locating ? "…" : "موقعي الحالي"}
            </button>
          </div>
          <span className="absolute right-[2.3rem] top-[3.9rem] h-6 border-r-2 border-dotted border-primary/50" aria-hidden />
          {/* swap */}
          <div className="relative h-0">
            <span className="absolute inset-x-4 top-0 border-t border-line" aria-hidden />
            <button
              type="button"
              onClick={swap}
              aria-label="بدّل الاستلام والتسليم"
              className="absolute left-1/2 -translate-x-1/2 -top-[18px] w-9 h-9 rounded-full bg-panel border border-line shadow-sm grid place-items-center text-ink-2 hover:text-primary"
            >
              <Icon name="swap" className="w-4 h-4" />
            </button>
          </div>
          {/* drop-off */}
          <div className="flex items-center gap-3 p-4 pt-4">
            <span className="w-11 h-11 shrink-0 rounded-full bg-primary-soft text-primary grid place-items-center">
              <Icon name="flag" className="w-5 h-5" />
            </span>
            <label className="flex-1 min-w-0">
              <span className="block font-extrabold">مكان التسليم</span>
              <input
                value={dropoffAddr}
                onChange={(e) => setDropoffAddr(e.target.value)}
                onFocus={() => setActive("b")}
                placeholder="العنوان بالتفصيل"
                className="w-full bg-transparent text-ink-2 placeholder:text-muted/70 outline-none py-0.5"
              />
            </label>
            <button
              type="button"
              onClick={() => setMapOpen((o) => !o)}
              aria-expanded={mapOpen}
              className="shrink-0 flex items-center gap-1 text-sm font-bold text-primary rounded-full border border-line px-2.5 py-1.5 hover:bg-primary-soft"
            >
              <Icon name="map" className="w-4 h-4" />
              الخريطة
              <Icon name={mapOpen ? "chevronUp" : "chevronDown"} className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* map (collapsible) */}
        <div className={mapOpen ? "block" : "hidden"}>
          <div className="px-4 pb-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setActive("a")} className={`rounded-xl py-2 text-sm font-bold border-2 ${active === "a" ? "border-booked bg-booked-soft text-booked" : "border-line bg-panel text-ink-2"}`}>
              حدّد الاستلام
            </button>
            <button type="button" onClick={() => setActive("b")} className={`rounded-xl py-2 text-sm font-bold border-2 ${active === "b" ? "border-primary bg-primary-soft text-primary" : "border-line bg-panel text-ink-2"}`}>
              حدّد التسليم
            </button>
          </div>
          {mapError ? (
            <div className="mx-4 mb-3 h-52 grid place-items-center rounded-xl bg-panel-2 text-center text-muted p-4 text-sm">الخريطة مش متاحة دلوقتي. عدّل المسافة يدوياً.</div>
          ) : (
            <div ref={mapEl} className="mx-4 mb-3 h-56 rounded-xl overflow-hidden bg-panel-2" />
          )}
        </div>

        {/* distance */}
        <div className="m-3 mt-0 rounded-2xl bg-primary-soft px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-ink-2">المسافة المتوقعة</span>
            {editKm ? (
              <input
                type="number"
                min="0"
                step="0.5"
                autoFocus
                value={km}
                onChange={(e) => setKm(Math.max(0, Number(e.target.value)))}
                onBlur={() => setEditKm(false)}
                className="w-20 rounded-lg border-2 border-primary bg-panel px-2 py-0.5 text-lg font-extrabold text-center"
              />
            ) : (
              <span className="text-2xl font-extrabold text-emph">{km}</span>
            )}
            <span className="font-bold">كم</span>
          </div>
          <button type="button" onClick={() => setEditKm((v) => !v)} className="flex items-center gap-1.5 text-primary font-bold">
            <Icon name="pencil" className="w-4 h-4" /> {editKm ? "تم" : "تعديل"}
          </button>
        </div>
      </section>

      {/* Date + time */}
      <section id="sec-time" className="scroll-mt-20 grid grid-cols-2 gap-3">
        <label className="relative bg-panel border border-line rounded-card shadow-sm p-3.5 flex flex-col gap-1.5 cursor-pointer">
          <span className="flex items-center gap-2 text-sm text-muted">
            <Icon name="calendar" className="w-5 h-5 text-ink" /> التاريخ
            <Icon name="chevronDown" className="w-4 h-4 mr-auto" />
          </span>
          <span className="font-bold whitespace-nowrap truncate">{dateLabel(date)}</span>
          <input
            type="date"
            min={today}
            max={addDaysISO(today, 30)}
            value={date}
            onChange={(e) => { if (e.target.value) { setDate(e.target.value); setTimeTouched(true); } }}
            onClick={(e) => (e.currentTarget as any).showPicker?.()}
            aria-label="التاريخ"
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>
        <label className="relative bg-panel border border-line rounded-card shadow-sm p-3.5 flex flex-col gap-1.5 cursor-pointer">
          <span className="flex items-center gap-2 text-sm text-muted">
            <Icon name="clock" className="w-5 h-5 text-ink" /> الوقت
            <Icon name="chevronDown" className="w-4 h-4 mr-auto" />
          </span>
          <span className="font-bold whitespace-nowrap">
            <span className="text-lg">{timeLabel(time).clock}</span> {timeLabel(time).part}
          </span>
          <select
            value={time}
            onChange={(e) => { setTime(e.target.value); setTimeTouched(true); }}
            aria-label="الوقت"
            className="absolute inset-0 opacity-0 cursor-pointer"
          >
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {timeLabel(t).clock} {timeLabel(t).part}
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* What are you moving? */}
      <section className="flex flex-col gap-2.5">
        <h2 className="text-lg font-extrabold">ماذا ستنقل؟</h2>
        <div className="grid grid-cols-4 gap-2">
          {CARGO_HINTS.map((h) => {
            const on = hint === h.size;
            return (
              <button
                key={h.size}
                type="button"
                onClick={() => pickHint(h.size)}
                aria-pressed={on}
                className={`rounded-2xl border-2 py-3 px-1 flex flex-col items-center gap-1.5 text-center ${
                  on ? "border-primary bg-primary-soft" : "border-line bg-panel hover:border-line-2"
                }`}
              >
                <Icon name={h.icon} className={`w-7 h-7 ${on ? "text-primary" : "text-ink-2"}`} />
                <span className="text-xs font-bold leading-tight">{h.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Vehicle */}
      <section id="sec-vehicle" className="scroll-mt-20 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold flex items-center gap-1.5">
            اختر العربية المناسبة
            <Icon name="help" className="w-5 h-5 text-muted" />
          </h2>
          <button type="button" onClick={() => setCompareOpen((o) => !o)} className="text-sm font-bold text-primary underline underline-offset-4 flex items-center gap-1">
            مقارنة العربيات
            <Icon name={compareOpen ? "chevronUp" : "chevronLeft"} className="w-4 h-4" />
          </button>
        </div>
        {compareOpen && (
          <div className="bg-panel border border-line rounded-card overflow-hidden text-sm">
            {sizes.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-line last:border-0">
                <span className={`w-8 text-center rounded-full py-0.5 text-xs font-extrabold ${SIZE_BADGE[s.sizeCode] ?? "bg-panel-2"}`}>{s.sizeCode}</span>
                <span className="font-bold w-20 shrink-0">{s.name}</span>
                <span className="text-muted flex-1 min-w-0 truncate">{s.description}</span>
                {s.capacityKg != null && <span className="text-ink-2 shrink-0">{s.capacityKg.toLocaleString("en-US")} كجم</span>}
              </div>
            ))}
          </div>
        )}
        <div className="-mx-4 px-4 flex gap-2.5 overflow-x-auto snap-x pb-1 [scrollbar-width:none]">
          {sizes.map((s) => {
            const selected = s.id === sizeId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { setSizeId(s.id); setVehicleTouched(true); }}
                aria-pressed={selected}
                className={`relative snap-start shrink-0 w-[8.4rem] rounded-2xl border-2 p-2.5 pt-3 flex flex-col items-center gap-1 text-center ${
                  selected ? "border-primary bg-panel shadow-[0_6px_16px_rgba(19,95,90,0.15)]" : "border-line bg-panel"
                }`}
              >
                {selected && (
                  <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary text-white grid place-items-center">
                    <Icon name="check" className="w-3.5 h-3.5" strokeWidth={3.2} />
                  </span>
                )}
                {recommended === s.id && (
                  <span className="absolute top-2 right-2 rounded-full bg-primary-soft text-primary-ink px-2 py-0.5 text-[11px] font-bold">مُقترح</span>
                )}
                <div className="w-full aspect-[4/3] mt-3 rounded-xl overflow-hidden bg-panel-2 grid place-items-center">
                  {s.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                  ) : (
                    <Icon name="truck" className="w-10 h-10 text-primary" />
                  )}
                </div>
                <span className="font-extrabold mt-1">{s.name}</span>
                <span className={`rounded-full px-3 py-0.5 text-xs font-extrabold ${SIZE_BADGE[s.sizeCode] ?? "bg-panel-2"}`}>{s.sizeCode}</span>
                {s.capacityKg != null && <span className="text-xs text-ink-2">{capacityLabel(s.capacityKg)}</span>}
                {s.dims && <span className="text-[11px] text-muted" dir="ltr">{s.dims.replace(/×/g, " × ")} سم</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Details: loaders + coupon */}
      <section id="sec-details" className="scroll-mt-20 flex flex-col gap-3">
        <div className="bg-panel border border-line rounded-card shadow-sm p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Icon name="user" className="w-7 h-7 text-ink-2" />
            <div>
              <div className="font-extrabold">العمالة المساعدة</div>
              {loaderFee ? <div className="text-sm text-muted">{formatEgp(loaderFee)} لكل فرد</div> : <div className="text-sm text-muted">أفراد يساعدوا في التحميل</div>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="زوّد" onClick={() => setLoaders((n) => Math.min(6, n + 1))} className="w-10 h-10 rounded-full bg-panel-2 text-xl font-bold hover:bg-primary-soft">+</button>
            <span className="w-6 text-center text-2xl font-extrabold">{loaders}</span>
            <button type="button" aria-label="قلّل" onClick={() => setLoaders((n) => Math.max(0, n - 1))} className="w-10 h-10 rounded-full bg-panel-2 text-xl font-bold hover:bg-primary-soft">−</button>
          </div>
        </div>

        <div className="bg-panel border border-line rounded-card shadow-sm p-4 flex flex-col gap-2">
          <span className="flex items-center gap-3 font-extrabold">
            <Icon name="ticket" className="w-7 h-7 text-ink-2 shrink-0" /> كود الخصم
          </span>
          <div className="flex items-center gap-2">
            <input
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              placeholder="اكتب كود الخصم هنا"
              className="flex-1 min-w-0 rounded-xl bg-panel-2 border border-line px-3 py-2.5 outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => { setPromoMsg(null); setAppliedPromo(promo.trim()); }}
              disabled={!promo.trim()}
              className="shrink-0 rounded-xl border-2 border-primary text-primary px-4 py-2 font-bold hover:bg-primary-soft disabled:opacity-40"
            >
              تطبيق
            </button>
          </div>
          {promoMsg && (
            <span className={`text-sm font-bold flex items-center gap-1 ${promoMsg.ok ? "text-ok" : "text-booked"}`}>
              {promoMsg.ok && <Icon name="check" className="w-4 h-4" strokeWidth={3} />}
              {promoMsg.text}
            </span>
          )}
        </div>
        <p className="text-xs text-muted text-center">السعر تقديري حسب المسافة والحجم، والسعر النهائي بيتأكد مع خدمة العملاء.</p>
      </section>

      {/* spacer so the sticky bar never hides content */}
      <div className="h-24" aria-hidden />

      {/* Sticky order bar (sits above the bottom nav) */}
      <div className="fixed inset-x-0 bottom-[calc(4.4rem+env(safe-area-inset-bottom))] z-30">
        <div className="max-w-lg mx-auto bg-panel border-t border-line shadow-[0_-8px_24px_rgba(16,32,28,0.08)] rounded-t-3xl">
          {detailsOpen && quote && (
            <div className="px-4 pt-4 max-h-[45vh] overflow-y-auto">
              <PriceBreakdown quote={quote} />
            </div>
          )}
          {orderErr && <div className="mx-4 mt-3 bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-bold text-center">{orderErr}</div>}
          <div className="flex items-center gap-3 p-3">
            <button
              type="button"
              onClick={placeOrder}
              disabled={ordering || !quote}
              className="tap flex-1 whitespace-nowrap rounded-2xl bg-accent text-on-accent px-3 text-lg font-extrabold flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(242,165,65,0.35)] hover:brightness-105 disabled:opacity-50"
            >
              {ordering ? "بنبعت الطلب…" : "اطلب التوصيلة"}
              <Icon name="chevronLeft" className="w-5 h-5" strokeWidth={2.6} />
            </button>
            <div className="text-center shrink-0">
              <div className={`text-2xl font-extrabold leading-none ${pricing ? "opacity-50" : ""}`}>{quote ? formatEgp(quote.total, { withUnit: false }) : "—"}</div>
              <div className="text-xs text-muted mt-1">الإجمالي (جنيه)</div>
            </div>
            <button
              type="button"
              onClick={() => setDetailsOpen((o) => !o)}
              disabled={!quote}
              aria-expanded={detailsOpen}
              className="shrink-0 text-xs font-bold text-primary flex flex-col items-center leading-tight disabled:opacity-40"
            >
              <Icon name={detailsOpen ? "chevronDown" : "chevronUp"} className="w-4 h-4" />
              تفاصيل السعر
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
