"use client";
import { useEffect, useRef, type RefObject } from "react";
import { loadGoogleMaps, onMapsAuthFailure, pinElement } from "@/lib/google-maps";
import type { LatLng, Stop } from "./model";

type UseDeliveryMapArgs = {
  apiKey: string;
  mapId: string;
  open: boolean;
  container: RefObject<HTMLDivElement | null>;
  center: LatLng;
  /** the two stops; a missing point has no pin yet */
  points: Record<Stop, LatLng | null>;
  /** which pin a tap on the map places */
  active: Stop;
  /** a pin was placed by a tap or moved by dragging */
  onPick: (stop: Stop, point: LatLng) => void;
  onError: () => void;
};

/**
 * Google map with draggable pickup/drop-off pins. Built lazily the first time it opens; afterwards the
 * pins follow `points` (search picks, saved addresses, "my location", swap) and the view keeps both in sight.
 */
export function useDeliveryMap({
  apiKey,
  mapId,
  open,
  container,
  center,
  points,
  active,
  onPick,
  onError,
}: UseDeliveryMapArgs) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Record<Stop, google.maps.marker.AdvancedMarkerElement | null>>({
    a: null,
    b: null,
  });
  const activeRef = useRef<Stop>(active);
  activeRef.current = active;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const pointsRef = useRef(points);
  pointsRef.current = points;

  /** Puts each pin where `points` says and keeps both in view. */
  function sync() {
    const map = mapRef.current;
    if (!map) return;
    const placed: LatLng[] = [];
    for (const stop of ["a", "b"] as const) {
      const point = pointsRef.current[stop];
      let marker = markersRef.current[stop];
      if (!point) {
        if (marker) marker.map = null;
        continue;
      }
      placed.push(point);
      if (!marker) {
        marker = new google.maps.marker.AdvancedMarkerElement({
          content: pinElement(stop),
          gmpDraggable: true,
          title: stop === "a" ? "مكان الاستلام" : "مكان التسليم",
        });
        marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) onPickRef.current(stop, e.latLng.toJSON());
        });
        markersRef.current[stop] = marker;
      }
      marker.position = point;
      marker.map = map;
    }
    const bounds = map.getBounds();
    const outOfView = placed.some((p) => !bounds?.contains(p));
    if (placed.length === 2 && outOfView) {
      const fit = new google.maps.LatLngBounds();
      placed.forEach((p) => fit.extend(p));
      map.fitBounds(fit, 56);
    } else if (placed.length === 1 && outOfView) {
      map.panTo(placed[0]);
      if ((map.getZoom() ?? 0) < 14) map.setZoom(15);
    }
  }

  useEffect(() => {
    if (!open || mapRef.current) return;
    let cancelled = false;
    const stopAuth = onMapsAuthFailure(onError);
    loadGoogleMaps(apiKey)
      .then(() => Promise.all([google.maps.importLibrary("maps"), google.maps.importLibrary("marker")]))
      .then(() => {
        if (cancelled || !container.current || mapRef.current) return;
        const map = new google.maps.Map(container.current, {
          center,
          zoom: 12,
          mapId,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: window.matchMedia("(pointer: coarse)").matches ? "cooperative" : "greedy",
        });
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) onPickRef.current(activeRef.current, e.latLng.toJSON());
        });
        mapRef.current = map;
        google.maps.event.addListenerOnce(map, "idle", sync);
      })
      .catch(onError);
    return () => {
      cancelled = true;
      stopAuth();
    };
    // the map is built once; later changes go through the points effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(sync, [points.a, points.b]);
}
