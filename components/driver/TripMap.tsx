"use client";
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, onMapsAuthFailure, pinElement, type LatLng } from "@/lib/google-maps";

type TripMapProps = {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  maps: { apiKey: string; mapId: string } | null;
};

/** Read-only map of the pickup → drop-off for a driver (same pins as the order screen). */
export function TripMap({ pickup, dropoff, maps }: TripMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const built = useRef(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!pickup || !dropoff || !maps || built.current) return;
    let cancelled = false;
    const stopAuth = onMapsAuthFailure(() => setErr(true));
    loadGoogleMaps(maps.apiKey)
      .then(() => Promise.all([google.maps.importLibrary("maps"), google.maps.importLibrary("marker")]))
      .then(() => {
        if (cancelled || !el.current || built.current) return;
        built.current = true;
        const map = new google.maps.Map(el.current, {
          mapId: maps.mapId,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "cooperative",
        });
        new google.maps.marker.AdvancedMarkerElement({
          map,
          position: pickup,
          content: pinElement("a"),
          title: "الاستلام",
        });
        new google.maps.marker.AdvancedMarkerElement({
          map,
          position: dropoff,
          content: pinElement("b"),
          title: "التسليم",
        });
        // dashed straight line: a hint of direction, not the road route
        new google.maps.Polyline({
          map,
          path: [pickup, dropoff],
          strokeOpacity: 0,
          icons: [
            {
              icon: {
                path: "M 0,-1 0,1",
                strokeOpacity: 1,
                strokeColor: "#0b6b5b",
                strokeWeight: 4,
                scale: 3,
              },
              offset: "0",
              repeat: "14px",
            },
          ],
        });
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(pickup);
        bounds.extend(dropoff);
        map.fitBounds(bounds, { top: 80, bottom: 80, left: 40, right: 40 });
      })
      .catch(() => setErr(true));
    return () => {
      cancelled = true;
      stopAuth();
    };
  }, [pickup, dropoff, maps]);

  if (!pickup || !dropoff || !maps || err) {
    return (
      <div className="h-72 grid place-items-center bg-panel-2 rounded-card border border-line text-center text-muted p-4">
        المكان على الخريطة مش متوفر — اتصل بالعميل لتحديد المكان.
      </div>
    );
  }
  return (
    <div
      ref={el}
      className="h-72 w-full rounded-card overflow-hidden border border-line bg-panel-2 relative z-0"
    />
  );
}
