"use client";
/* eslint-disable @typescript-eslint/no-explicit-any -- Leaflet is loaded from a CDN at runtime, untyped */
import { useEffect, useRef, type RefObject } from "react";
import type { LatLng, Stop } from "./model";

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
function pinIcon(L: any, kind: Stop) {
  const bg = kind === "a" ? "#d9452b" : "#0b6b5b";
  const glyph =
    kind === "a"
      ? '<circle cx="12" cy="10" r="3" fill="#fff"/>'
      : '<path d="M8 17V6s1-1 3-1 3 1.5 5 1.5 2-.5 2-.5v6s-.5.5-2 .5-3-1.5-5-1.5-3 1-3 1" fill="#fff"/>';
  return L.divIcon({
    className: "",
    html:
      '<svg width="34" height="42" viewBox="0 0 24 30" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))">' +
      `<path d="M12 29s9-8.6 9-17A9 9 0 0 0 3 12c0 8.4 9 17 9 17z" fill="${bg}"/>${glyph}</svg>`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
  });
}

type UseDeliveryMapArgs = {
  open: boolean;
  container: RefObject<HTMLDivElement | null>;
  center: LatLng;
  pickup: LatLng;
  dropoff: LatLng;
  /** which pin a tap on the map moves */
  active: Stop;
  onMove: (stop: Stop, point: LatLng) => void;
  onError: () => void;
};

/**
 * Leaflet map with draggable pickup/drop-off pins. Built lazily the first time it opens.
 * Returns helpers to move a pin or the view from outside (saved address, "my location", swap).
 */
export function useDeliveryMap({
  open,
  container,
  center,
  pickup,
  dropoff,
  active,
  onMove,
  onError,
}: UseDeliveryMapArgs) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ a: any; b: any }>({ a: null, b: null });
  const activeRef = useRef<Stop>(active);
  activeRef.current = active;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    if (!open) return;
    if (mapRef.current) {
      setTimeout(() => mapRef.current.invalidateSize(), 50);
      return;
    }
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !container.current || mapRef.current) return;
        const map = L.map(container.current).setView([center.lat, center.lng], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);
        const a = L.marker([pickup.lat, pickup.lng], { draggable: true, icon: pinIcon(L, "a") }).addTo(map);
        const b = L.marker([dropoff.lat, dropoff.lng], { draggable: true, icon: pinIcon(L, "b") }).addTo(map);
        markersRef.current = { a, b };
        a.on("dragend", () => onMoveRef.current("a", a.getLatLng()));
        b.on("dragend", () => onMoveRef.current("b", b.getLatLng()));
        map.on("click", (e: any) => {
          const stop = activeRef.current;
          markersRef.current[stop].setLatLng(e.latlng);
          onMoveRef.current(stop, { lat: e.latlng.lat, lng: e.latlng.lng });
        });
        mapRef.current = map;
      })
      .catch(onError);
    return () => {
      cancelled = true;
    };
    // the map is built once; later pin moves go through setPin
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return {
    setPin(stop: Stop, point: LatLng) {
      markersRef.current[stop]?.setLatLng([point.lat, point.lng]);
    },
    focus(point: LatLng) {
      mapRef.current?.setView([point.lat, point.lng], 14);
    },
  };
}
