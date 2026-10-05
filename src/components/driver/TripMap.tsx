"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";

interface LatLng {
  lat: number;
  lng: number;
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
    html: `<div style="font-size:30px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

/** Read-only map showing the pickup → dropoff route for a driver. */
export function TripMap({ pickup, dropoff }: { pickup: LatLng | null; dropoff: LatLng | null }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!pickup || !dropoff) return;
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !el.current || mapRef.current) return;
        const map = L.map(el.current, { zoomControl: true });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap", maxZoom: 19 }).addTo(map);
        L.marker([pickup.lat, pickup.lng], { icon: pinIcon(L, "📍") }).addTo(map);
        L.marker([dropoff.lat, dropoff.lng], { icon: pinIcon(L, "🏁") }).addTo(map);
        L.polyline([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]], { color: "#0e7a5f", weight: 4, dashArray: "6 6" }).addTo(map);
        map.fitBounds([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]], { padding: [40, 40] });
        mapRef.current = map;
      })
      .catch(() => setErr(true));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pickup || !dropoff || err) {
    return (
      <div className="h-64 grid place-items-center bg-panel-2 rounded-card border border-line text-center text-muted p-4">
        المكان على الخريطة مش متوفر — اتصل بالعميل لتحديد المكان.
      </div>
    );
  }
  return <div ref={el} className="h-64 w-full rounded-card overflow-hidden border border-line bg-panel-2" />;
}
