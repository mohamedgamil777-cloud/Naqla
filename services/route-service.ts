import "server-only";
/**
 * Trip distance for customer quotes and orders, worked out on the server — the browser's km is not trusted.
 *
 *  - Points: the coordinates the page sends (must be inside Egypt), or — when a stop has none — the
 *    typed address geocoded here (Geocoding API).
 *  - Distance: the road distance from the Routes API (computeRoutes, DRIVE).
 *  - Needs GOOGLE_MAPS_SERVER_KEY (Routes API + Geocoding API). The browser key can't be used here: it is
 *    restricted to the site's web addresses.
 *
 * Without a server key (current production) the old behaviour is kept so ordering doesn't stop:
 * both pins known → straight line × 1.3 computed here; no pins → the km the customer entered.
 */
import { getEnv } from "@/lib/env";

export interface Point {
  lat: number;
  lng: number;
}

export type DistanceSource = "road" | "straight" | "customer";

export type TripDistance =
  | { ok: true; km: number; source: DistanceSource; pickup: Point | null; dropoff: Point | null }
  | { ok: false; reason: "NO_POINTS" | "OUTSIDE_EGYPT" | "ADDRESS_NOT_FOUND" | "ROUTE_FAILED" };

export interface TripInput {
  pickup?: Point | null;
  dropoff?: Point | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  /** only used while no server key is configured, and only when there are no pins */
  customerKm?: number | null;
}

type Fetch = typeof fetch;

/** Generous box around Egypt (incl. Sinai, Red Sea coast, Halayeb). */
export function inEgypt(p: Point): boolean {
  return (
    Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat >= 21.5 && p.lat <= 31.9 && p.lng >= 24.5 && p.lng <= 37.2
  );
}

function haversineKm(a: Point, b: Point): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Same estimate the page used to compute (straight line × 1.3), one decimal. */
export function straightLineKm(a: Point, b: Point): number {
  return Math.round(haversineKm(a, b) * 1.3 * 10) / 10;
}

// ---- small per-instance caches: the page re-quotes on every change (loaders, coupon, size) ----
const MAX_CACHE = 500;
const routeCache = new Map<string, number>();
const geocodeCache = new Map<string, Point | null>();
function remember<V>(cache: Map<string, V>, key: string, value: V) {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
  cache.set(key, value);
}
const pointKey = (p: Point) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

/** Test helper. */
export function clearRouteCaches() {
  routeCache.clear();
  geocodeCache.clear();
}

/** Road km between two points (Routes API), or null when Google has no route / fails. */
export async function roadKm(a: Point, b: Point, key: string, fetchFn: Fetch = fetch): Promise<number | null> {
  const cacheKey = `${pointKey(a)}>${pointKey(b)}`;
  const hit = routeCache.get(cacheKey);
  if (hit !== undefined) return hit;
  try {
    const res = await fetchFn("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.distanceMeters", // only what we use (billing + speed)
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: a.lat, longitude: a.lng } } },
        destination: { location: { latLng: { latitude: b.lat, longitude: b.lng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        units: "METRIC",
        regionCode: "EG",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[route] computeRoutes ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const data = (await res.json()) as { routes?: { distanceMeters?: number }[] };
    const meters = data.routes?.[0]?.distanceMeters;
    if (typeof meters !== "number" || !Number.isFinite(meters)) return null; // no drivable route
    const km = Math.round((meters / 1000) * 10) / 10;
    remember(routeCache, cacheKey, km);
    return km;
  } catch (err) {
    console.error("[route] computeRoutes failed:", err);
    return null;
  }
}

/** Point for a typed address in Egypt (Geocoding API), or null. */
export async function geocodeEgypt(text: string, key: string, fetchFn: Fetch = fetch): Promise<Point | null> {
  const q = text.trim().replace(/\s+/g, " ");
  if (q.length < 3) return null;
  if (geocodeCache.has(q)) return geocodeCache.get(q) ?? null;
  try {
    const url =
      "https://maps.googleapis.com/maps/api/geocode/json?" +
      new URLSearchParams({ address: q, region: "eg", language: "ar", components: "country:EG", key });
    const res = await fetchFn(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: string;
      results?: { geometry: { location: { lat: number; lng: number } } }[];
      error_message?: string;
    };
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error(`[route] geocode ${data.status}: ${data.error_message ?? ""}`);
      return null; // don't cache key / quota problems
    }
    const loc = data.results?.[0]?.geometry.location;
    const point = loc && inEgypt(loc) ? { lat: loc.lat, lng: loc.lng } : null;
    remember(geocodeCache, q, point);
    return point;
  } catch (err) {
    console.error("[route] geocode failed:", err);
    return null;
  }
}

/** The km a customer quote / order is priced with. */
export async function tripDistance(
  input: TripInput,
  opts: { key?: string | null; fetchFn?: Fetch } = {},
): Promise<TripDistance> {
  const key = opts.key === undefined ? (getEnv().GOOGLE_MAPS_SERVER_KEY ?? null) : opts.key;
  const fetchFn = opts.fetchFn ?? fetch;

  for (const p of [input.pickup, input.dropoff]) {
    if (p && !inEgypt(p)) return { ok: false, reason: "OUTSIDE_EGYPT" };
  }

  let pickup = input.pickup ?? null;
  let dropoff = input.dropoff ?? null;

  if (key) {
    // a stop without a pin: find its typed address
    const [pa, pb] = await Promise.all([
      !pickup && input.pickupAddress ? geocodeEgypt(input.pickupAddress, key, fetchFn) : null,
      !dropoff && input.dropoffAddress ? geocodeEgypt(input.dropoffAddress, key, fetchFn) : null,
    ]);
    pickup ??= pa;
    dropoff ??= pb;
    if (!pickup || !dropoff) {
      const typed = Boolean((!pickup && input.pickupAddress?.trim()) || (!dropoff && input.dropoffAddress?.trim()));
      return { ok: false, reason: typed ? "ADDRESS_NOT_FOUND" : "NO_POINTS" };
    }
    const km = await roadKm(pickup, dropoff, key, fetchFn);
    if (km === null) return { ok: false, reason: "ROUTE_FAILED" };
    return { ok: true, km, source: "road", pickup, dropoff };
  }

  // ---- no server key: keep the old behaviour, but compute it here when the pins are known ----
  if (pickup && dropoff) return { ok: true, km: straightLineKm(pickup, dropoff), source: "straight", pickup, dropoff };
  const km = input.customerKm;
  if (typeof km === "number" && Number.isFinite(km) && km >= 0)
    return { ok: true, km: Math.round(km * 10) / 10, source: "customer", pickup, dropoff };
  return { ok: false, reason: "NO_POINTS" };
}

/** Lat/lng pair from a request body (both or nothing). */
export function pointFrom(lat: number | null | undefined, lng: number | null | undefined): Point | null {
  return typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null;
}
