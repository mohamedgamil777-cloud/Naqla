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
/** Same pin language as the order screen: red pin = pickup, teal flag = drop-off. */
function pinIcon(L: any, kind: "a" | "b") {
  const bg = kind === "a" ? "#d9452b" : "#11645f";
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
        L.marker([pickup.lat, pickup.lng], { icon: pinIcon(L, "a") }).addTo(map);
        L.marker([dropoff.lat, dropoff.lng], { icon: pinIcon(L, "b") }).addTo(map);
        L.polyline([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]], { color: "#11645f", weight: 5, dashArray: "8 8" }).addTo(map);
        map.fitBounds([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]], { paddingTopLeft: [40, 80], paddingBottomRight: [40, 80] });
        mapRef.current = map;
      })
      .catch(() => setErr(true));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pickup || !dropoff || err) {
    return (
      <div className="h-72 grid place-items-center bg-panel-2 rounded-card border border-line text-center text-muted p-4">
        المكان على الخريطة مش متوفر — اتصل بالعميل لتحديد المكان.
      </div>
    );
  }
  return <div ref={el} className="h-72 w-full rounded-card overflow-hidden border border-line bg-panel-2 relative z-0" />;
}
