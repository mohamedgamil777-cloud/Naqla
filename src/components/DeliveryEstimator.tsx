"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { Button, inputClass, PriceBreakdown } from "@/components/ui";
import type { Quote } from "@/engines/pricing";

interface VehicleOpt {
  id: string;
  name: string;
  categoryName: string;
}
interface LatLng {
  lat: number;
  lng: number;
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

/** Approx road distance from straight-line distance (city road factor). */
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

export function DeliveryEstimator({ vehicles, center }: { vehicles: VehicleOpt[]; center: LatLng }) {
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

  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [loaders, setLoaders] = useState(0);
  const [promo, setPromo] = useState("");
  const [km, setKm] = useState(() => roadKm(pickup, dropoff));

  const [quote, setQuote] = useState<Quote | null>(null);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Init map once Leaflet loads.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapEl.current || mapRef.current) return;
        const map = L.map(mapEl.current).setView([center.lat, center.lng], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);

        const a = L.marker([pickup.lat, pickup.lng], { draggable: true, icon: pinIcon(L, "📍") }).addTo(map);
        const b = L.marker([dropoff.lat, dropoff.lng], { draggable: true, icon: pinIcon(L, "🏁") }).addTo(map);
        markersRef.current = { a, b };

        a.on("dragend", () => {
          const p = a.getLatLng();
          setPickup({ lat: p.lat, lng: p.lng });
        });
        b.on("dragend", () => {
          const p = b.getLatLng();
          setDropoff({ lat: p.lat, lng: p.lng });
        });
        map.on("click", (e: any) => {
          const ll = { lat: e.latlng.lat, lng: e.latlng.lng };
          if (activeRef.current === "a") {
            a.setLatLng(e.latlng);
            setPickup(ll);
          } else {
            b.setLatLng(e.latlng);
            setDropoff(ll);
          }
        });
        mapRef.current = map;
        setReady(true);
      })
      .catch(() => setMapError(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute distance whenever an endpoint moves.
  useEffect(() => {
    setKm(roadKm(pickup, dropoff));
    setQuote(null); // price is now stale
  }, [pickup, dropoff]);

  async function estimate() {
    if (!vehicleId) return;
    setBusy(true);
    setPromoMsg(null);
    try {
      const r = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId, km, loaders, promoCode: promo || null }),
      });
      const j = await r.json();
      if (j.quote) {
        setQuote(j.quote);
        if (promo.trim()) {
          setPromoMsg(
            j.promoApplied
              ? { ok: true, text: "تم تطبيق الكوبون ✅" }
              : { ok: false, text: "الكوبون مش صحيح أو مش مطابق للشروط" }
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Map */}
      <div className="rounded-card overflow-hidden border border-line">
        {mapError ? (
          <div className="h-64 grid place-items-center bg-panel-2 text-center text-muted p-4">
            الخريطة مش متاحة دلوقتي. اكتب المسافة بالكيلومتر تحت يدوياً.
          </div>
        ) : (
          <div ref={mapEl} className="h-64 w-full bg-panel-2" />
        )}
      </div>

      {/* Which pin does a tap move */}
      {ready && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActive("a")}
            className={`rounded-2xl py-3 font-bold tap border-2 ${active === "a" ? "border-ok bg-ok-soft text-ok" : "border-line-2 bg-panel"}`}
          >
            📍 مكان الاستلام
          </button>
          <button
            onClick={() => setActive("b")}
            className={`rounded-2xl py-3 font-bold tap border-2 ${active === "b" ? "border-booked bg-booked-soft text-booked" : "border-line-2 bg-panel"}`}
          >
            🏁 مكان التسليم
          </button>
        </div>
      )}
      <p className="text-sm text-muted -mt-1">
        دوس على الخريطة عشان تحدد المكان، أو اسحب العلامة. اختر الأول تحدد الاستلام ولا التسليم.
      </p>

      {/* Optional address labels */}
      <input className={inputClass} placeholder="عنوان الاستلام (اختياري)" value={pickupAddr} onChange={(e) => setPickupAddr(e.target.value)} />
      <input className={inputClass} placeholder="عنوان التسليم (اختياري)" value={dropoffAddr} onChange={(e) => setDropoffAddr(e.target.value)} />

      {/* Distance */}
      <div className="bg-panel border border-line rounded-card p-4 flex items-center justify-between">
        <span className="font-bold">المسافة التقديرية</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.5"
            value={km}
            onChange={(e) => {
              setKm(Math.max(0, Number(e.target.value)));
              setQuote(null);
            }}
            className="w-24 rounded-xl border-2 border-line-2 bg-panel px-3 py-2 text-lg text-center"
          />
          <span className="font-bold text-lg">كم</span>
        </div>
      </div>

      {/* Vehicle */}
      <label className="block">
        <span className="block mb-2 font-bold">نوع العربية</span>
        <select
          value={vehicleId}
          onChange={(e) => {
            setVehicleId(e.target.value);
            setQuote(null);
          }}
          className={inputClass}
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} — {v.categoryName}
            </option>
          ))}
        </select>
      </label>

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
        <input
          className={inputClass}
          placeholder="عندك كوبون خصم؟ اكتبه هنا"
          value={promo}
          onChange={(e) => setPromo(e.target.value)}
        />
        {promoMsg && (
          <span className={`text-sm font-bold ${promoMsg.ok ? "text-ok" : "text-booked"}`}>{promoMsg.text}</span>
        )}
      </div>

      <Button full onClick={estimate} disabled={busy || !vehicleId}>
        {busy ? "بنحسب…" : "احسب السعر"}
      </Button>

      {quote && (
        <div className="flex flex-col gap-2">
          <PriceBreakdown quote={quote} />
          <p className="text-xs text-muted text-center">السعر تقديري حسب المسافة. السعر النهائي يتأكد مع خدمة العملاء.</p>
        </div>
      )}
    </div>
  );
}
