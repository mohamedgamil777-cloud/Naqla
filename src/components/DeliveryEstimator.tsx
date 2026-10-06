"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { Button, inputClass, PriceBreakdown } from "@/components/ui";
import { cairoDateISO } from "@/lib/client-time";
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

const SIZE_EMOJI: Record<string, string> = { XS: "🛺", S: "🚐", M: "🛻", L: "🚛" };

/** Quick "what are you moving?" chips → recommended size. */
const CARGO_HINTS: { label: string; size: string }[] = [
  { label: "ظرف / أوراق", size: "XS" },
  { label: "صناديق / كراسي", size: "S" },
  { label: "أثاث / أجهزة", size: "M" },
  { label: "عفش بيت", size: "L" },
];

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
function pinIcon(L: any, emoji: string) {
  return L.divIcon({
    className: "",
    html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

export function DeliveryEstimator({ sizes, center, initialSizeCode }: { sizes: SizeOpt[]; center: LatLng; initialSizeCode?: string }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ a: any; b: any }>({ a: null, b: null });
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [active, setActive] = useState<"a" | "b">("a");
  const activeRef = useRef<"a" | "b">("a");
  activeRef.current = active;

  const [pickup, setPickup] = useState<LatLng>({ lat: center.lat + 0.008, lng: center.lng - 0.008 });
  const [dropoff, setDropoff] = useState<LatLng>({ lat: center.lat - 0.008, lng: center.lng + 0.008 });
  const [pickupAddr, setPickupAddr] = useState("");
  const [dropoffAddr, setDropoffAddr] = useState("");
  const [km, setKm] = useState(() => roadKm({ lat: center.lat + 0.008, lng: center.lng - 0.008 }, { lat: center.lat - 0.008, lng: center.lng + 0.008 }));

  // recommend S by default if present, else the first size.
  const [sizeId, setSizeId] = useState(
    () => (sizes.find((s) => s.sizeCode === initialSizeCode) ?? sizes.find((s) => s.sizeCode === "S") ?? sizes[0])?.id ?? ""
  );
  const [recommended, setRecommended] = useState<string | null>(null);

  const today = cairoDateISO(0);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");

  const [loaders, setLoaders] = useState(0);
  const [promo, setPromo] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [orderErr, setOrderErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapEl.current || mapRef.current) return;
        const map = L.map(mapEl.current).setView([center.lat, center.lng], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap", maxZoom: 19 }).addTo(map);
        const a = L.marker([pickup.lat, pickup.lng], { draggable: true, icon: pinIcon(L, "📍") }).addTo(map);
        const b = L.marker([dropoff.lat, dropoff.lng], { draggable: true, icon: pinIcon(L, "🏁") }).addTo(map);
        markersRef.current = { a, b };
        a.on("dragend", () => { const p = a.getLatLng(); setPickup({ lat: p.lat, lng: p.lng }); });
        b.on("dragend", () => { const p = b.getLatLng(); setDropoff({ lat: p.lat, lng: p.lng }); });
        map.on("click", (e: any) => {
          const ll = { lat: e.latlng.lat, lng: e.latlng.lng };
          if (activeRef.current === "a") { a.setLatLng(e.latlng); setPickup(ll); }
          else { b.setLatLng(e.latlng); setDropoff(ll); }
        });
        mapRef.current = map;
        setReady(true);
      })
      .catch(() => setMapError(true));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setKm(roadKm(pickup, dropoff));
    setQuote(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, dropoff]);

  function pickHint(size: string) {
    const match = sizes.find((s) => s.sizeCode === size);
    if (match) {
      setSizeId(match.id);
      setRecommended(match.id);
      setQuote(null);
    }
  }

  async function estimate() {
    if (!sizeId) return;
    setBusy(true);
    setPromoMsg(null);
    try {
      const r = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: sizeId, km, loaders, promoCode: promo || null }),
      });
      const j = await r.json();
      if (j.quote) {
        setQuote(j.quote);
        if (promo.trim()) {
          setPromoMsg(j.promoApplied ? { ok: true, text: "تم تطبيق الكوبون ✅" } : { ok: false, text: "الكوبون مش صحيح أو مش مطابق للشروط" });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function placeOrder() {
    if (!sizeId) return;
    if (!pickupAddr.trim() || !dropoffAddr.trim()) {
      setOrderErr("اكتب عنوان الاستلام والتسليم عشان السواق يعرف المكان بالظبط.");
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
          promoCode: promo || null,
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
      else if (j.error === "PAST") setOrderErr("اختار ميعاد في المستقبل.");
      else setOrderErr("حصلت مشكلة، حاول تاني.");
    } catch {
      setOrderErr("حصلت مشكلة، حاول تاني.");
    } finally {
      setOrdering(false);
    }
  }

  if (orderCode) {
    return (
      <div className="bg-ok-soft text-ok rounded-card p-8 text-center flex flex-col items-center gap-3">
        <div className="text-6xl">✅</div>
        <h2 className="text-2xl font-extrabold">تم استلام طلبك!</h2>
        <p className="text-ink-2 font-semibold">رقم الطلب: <span dir="ltr">#{orderCode}</span></p>
        <p className="text-ink-2">هنتواصل معاك على موبايلك لتأكيد الميعاد والسواق.</p>
        <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
          <a href="/bookings" className="rounded-2xl bg-primary text-white px-6 py-3 font-bold tap">📦 تابع طلبك</a>
          <a href="/" className="rounded-2xl border-2 border-line-2 text-ink px-6 py-3 font-bold tap">تمام</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Map */}
      <div className="rounded-card overflow-hidden border border-line">
        {mapError ? (
          <div className="h-60 grid place-items-center bg-panel-2 text-center text-muted p-4">الخريطة مش متاحة دلوقتي. اكتب المسافة بالكيلومتر تحت يدوياً.</div>
        ) : (
          <div ref={mapEl} className="h-60 w-full bg-panel-2" />
        )}
      </div>
      {ready && (
        <div className="grid grid-cols-2 gap-2 -mt-2">
          <button onClick={() => setActive("a")} className={`rounded-2xl py-2.5 font-bold tap border-2 ${active === "a" ? "border-ok bg-ok-soft text-ok" : "border-line-2 bg-panel"}`}>📍 مكان الاستلام</button>
          <button onClick={() => setActive("b")} className={`rounded-2xl py-2.5 font-bold tap border-2 ${active === "b" ? "border-booked bg-booked-soft text-booked" : "border-line-2 bg-panel"}`}>🏁 مكان التسليم</button>
        </div>
      )}
      <input className={inputClass} placeholder="📍 عنوان الاستلام بالتفصيل (مطلوب)" value={pickupAddr} onChange={(e) => setPickupAddr(e.target.value)} />
      <input className={inputClass} placeholder="🏁 عنوان التسليم بالتفصيل (مطلوب)" value={dropoffAddr} onChange={(e) => setDropoffAddr(e.target.value)} />

      {/* Distance */}
      <div className="bg-panel border border-line rounded-card p-4 flex items-center justify-between">
        <span className="font-bold">المسافة التقديرية</span>
        <div className="flex items-center gap-2">
          <input type="number" min="0" step="0.5" value={km} onChange={(e) => { setKm(Math.max(0, Number(e.target.value))); setQuote(null); }} className="w-24 rounded-xl border-2 border-line-2 bg-panel px-3 py-2 text-lg text-center" />
          <span className="font-bold text-lg">كم</span>
        </div>
      </div>

      {/* Schedule (date + time only, no "now") */}
      <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
        <div className="font-bold">📅 ميعاد التوصيل</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-ink-2">اليوم</span>
            <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-ink-2">الساعة</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
          </label>
        </div>
      </div>

      {/* Recommend chips */}
      <div className="flex flex-col gap-2">
        <span className="font-bold">بتنقل إيه؟ <span className="text-muted font-normal text-sm">(هنرشّحلك الحجم)</span></span>
        <div className="flex flex-wrap gap-2">
          {CARGO_HINTS.map((h) => (
            <button key={h.size} onClick={() => pickHint(h.size)} className="rounded-full border-2 border-line-2 bg-panel px-4 py-2 font-bold tap hover:border-primary">
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* Size cards */}
      <div className="flex flex-col gap-3">
        <span className="font-bold">اختار حجم العربية</span>
        {sizes.map((s) => {
          const selected = s.id === sizeId;
          return (
            <button
              key={s.id}
              onClick={() => { setSizeId(s.id); setQuote(null); }}
              className={`text-right rounded-card border-2 p-3 flex items-center gap-3 tap ${selected ? "border-primary bg-primary-soft" : "border-line bg-panel"}`}
            >
              <div className="w-16 h-16 shrink-0 grid place-items-center rounded-xl bg-panel-2 text-3xl overflow-hidden">
                {s.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image} alt={s.name} className="w-full h-full object-contain" />
                ) : (
                  <span>{SIZE_EMOJI[s.sizeCode] ?? "🚚"}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg">{s.name}</span>
                  <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-bold">{s.sizeCode}</span>
                  {recommended === s.id && <span className="rounded-full bg-ok-soft text-ok px-2 py-0.5 text-xs font-bold">مُقترح</span>}
                </div>
                {s.description && <div className="text-sm text-muted truncate">{s.description}</div>}
                <div className="text-xs text-ink-2 mt-0.5">
                  {s.capacityKg != null && <span>حمولة {s.capacityKg >= 1000 ? `${s.capacityKg / 1000} طن` : `${s.capacityKg} كجم`}</span>}
                  {s.dims && <span> · {s.dims} سم</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Loaders */}
      <div className="bg-panel border border-line rounded-card p-4 flex items-center justify-between">
        <div>
          <div className="font-bold">عمالة مشال</div>
          <div className="text-sm text-muted">أفراد يساعدوا في التحميل</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setLoaders((n) => Math.max(0, n - 1)); setQuote(null); }} className="w-10 h-10 rounded-full bg-panel-2 border-2 border-line-2 text-xl font-bold tap">−</button>
          <span className="w-6 text-center text-xl font-extrabold">{loaders}</span>
          <button onClick={() => { setLoaders((n) => Math.min(6, n + 1)); setQuote(null); }} className="w-10 h-10 rounded-full bg-panel-2 border-2 border-line-2 text-xl font-bold tap">+</button>
        </div>
      </div>

      {/* Coupon */}
      <div className="flex flex-col gap-1.5">
        <input className={inputClass} placeholder="عندك كوبون خصم؟ اكتبه هنا" value={promo} onChange={(e) => setPromo(e.target.value)} />
        {promoMsg && <span className={`text-sm font-bold ${promoMsg.ok ? "text-ok" : "text-booked"}`}>{promoMsg.text}</span>}
      </div>

      <Button full onClick={estimate} disabled={busy || !sizeId}>
        {busy ? "بنحسب…" : "احسب السعر"}
      </Button>

      {quote && (
        <div className="flex flex-col gap-3">
          <PriceBreakdown quote={quote} />
          <p className="text-xs text-muted text-center">السعر تقديري حسب المسافة والحجم. السعر النهائي يتأكد مع خدمة العملاء.</p>
          {orderErr && <div className="bg-booked-soft text-booked rounded-xl px-3 py-2 text-sm font-bold text-center">{orderErr}</div>}
          <button
            onClick={placeOrder}
            disabled={ordering}
            className="w-full rounded-2xl bg-accent text-on-accent py-4 text-xl font-extrabold tap disabled:opacity-50"
          >
            {ordering ? "بنبعت الطلب…" : "اطلب التوصيلة"}
          </button>
        </div>
      )}
    </div>
  );
}
