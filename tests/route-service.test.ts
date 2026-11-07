import { beforeEach, describe, expect, it } from "vitest";
import { clearRouteCaches, inEgypt, straightLineKm, tripDistance } from "@/services/route-service";

const CAIRO_TAHRIR = { lat: 30.0444, lng: 31.2357 };
const NASR_CITY = { lat: 30.0561, lng: 31.3301 };
const ALEXANDRIA = { lat: 31.2001, lng: 29.9187 };
const KEY = "server-key";

type Call = { url: string; init?: RequestInit };

/** Fake Google: routes answer with `meters` (or a status / empty body), geocoding from a lookup table. */
function google(opts: {
  meters?: number | null;
  routeStatus?: number;
  places?: Record<string, { lat: number; lng: number } | null>;
}) {
  const calls: Call[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("computeRoutes")) {
      if (opts.routeStatus && opts.routeStatus !== 200) return new Response("denied", { status: opts.routeStatus });
      const body = opts.meters == null ? {} : { routes: [{ distanceMeters: opts.meters }] };
      return Response.json(body);
    }
    const address = new URL(String(url)).searchParams.get("address") ?? "";
    const hit = opts.places?.[address];
    return Response.json(
      hit ? { status: "OK", results: [{ geometry: { location: hit } }] } : { status: "ZERO_RESULTS", results: [] },
    );
  }) as typeof fetch;
  return { calls, fetchFn };
}

beforeEach(() => clearRouteCaches());

describe("tripDistance with a server key (road distance)", () => {
  it("prices with the Google road distance, not the km the browser sent", async () => {
    const g = google({ meters: 12_345 });
    const r = await tripDistance(
      { pickup: CAIRO_TAHRIR, dropoff: NASR_CITY, customerKm: 0.5 },
      { key: KEY, fetchFn: g.fetchFn },
    );
    expect(r).toMatchObject({ ok: true, km: 12.3, source: "road" });
    const headers = g.calls[0].init?.headers as Record<string, string>;
    expect(headers["X-Goog-FieldMask"]).toBe("routes.distanceMeters");
    expect(JSON.parse(String(g.calls[0].init?.body)).travelMode).toBe("DRIVE");
  });

  it("re-measures when a stop moves (scenarios 4–6) and reuses the cache otherwise", async () => {
    const g = google({ meters: 10_000 });
    await tripDistance({ pickup: CAIRO_TAHRIR, dropoff: NASR_CITY }, { key: KEY, fetchFn: g.fetchFn });
    await tripDistance({ pickup: CAIRO_TAHRIR, dropoff: NASR_CITY }, { key: KEY, fetchFn: g.fetchFn });
    expect(g.calls).toHaveLength(1);
    await tripDistance({ pickup: { lat: 30.05, lng: 31.24 }, dropoff: NASR_CITY }, { key: KEY, fetchFn: g.fetchFn });
    expect(g.calls).toHaveLength(2);
  });

  it("finds typed addresses on the server when there are no pins, across cities (scenarios 1, 9)", async () => {
    const g = google({ meters: 220_400, places: { "التحرير، القاهرة": CAIRO_TAHRIR, "سموحة، الإسكندرية": ALEXANDRIA } });
    const r = await tripDistance(
      { pickupAddress: "التحرير، القاهرة", dropoffAddress: "سموحة، الإسكندرية" },
      { key: KEY, fetchFn: g.fetchFn },
    );
    expect(r).toMatchObject({ ok: true, km: 220.4, source: "road", pickup: CAIRO_TAHRIR, dropoff: ALEXANDRIA });
  });

  it("mixes a GPS pin with a typed address (scenario 2)", async () => {
    const g = google({ meters: 9_000, places: { "مدينة نصر": NASR_CITY } });
    const r = await tripDistance({ pickup: CAIRO_TAHRIR, dropoffAddress: "مدينة نصر" }, { key: KEY, fetchFn: g.fetchFn });
    expect(r).toMatchObject({ ok: true, km: 9, source: "road" });
  });

  it("says the address wasn't found instead of guessing (scenario 7)", async () => {
    const g = google({ meters: 1_000, places: {} });
    const r = await tripDistance(
      { pickup: CAIRO_TAHRIR, dropoffAddress: "شارع مش موجود خالص" },
      { key: KEY, fetchFn: g.fetchFn },
    );
    expect(r).toEqual({ ok: false, reason: "ADDRESS_NOT_FOUND" });
  });

  it("gives no price when Google has no route or refuses (scenario 8)", async () => {
    for (const g of [google({ meters: null }), google({ routeStatus: 403 })]) {
      clearRouteCaches();
      const r = await tripDistance({ pickup: CAIRO_TAHRIR, dropoff: NASR_CITY }, { key: KEY, fetchFn: g.fetchFn });
      expect(r).toEqual({ ok: false, reason: "ROUTE_FAILED" });
    }
  });

  it("never falls back to the browser's km once a key is set", async () => {
    const g = google({ meters: 5_000 });
    const r = await tripDistance({ customerKm: 3 }, { key: KEY, fetchFn: g.fetchFn });
    expect(r).toEqual({ ok: false, reason: "NO_POINTS" });
    expect(g.calls).toHaveLength(0);
  });

  it("rejects pins outside Egypt", async () => {
    const g = google({ meters: 5_000 });
    const r = await tripDistance(
      { pickup: { lat: 48.85, lng: 2.35 }, dropoff: NASR_CITY },
      { key: KEY, fetchFn: g.fetchFn },
    );
    expect(r).toEqual({ ok: false, reason: "OUTSIDE_EGYPT" });
  });
});

describe("tripDistance without a server key (old behaviour, computed on the server)", () => {
  it("uses straight line × 1.3 from the pins and ignores the browser's km", async () => {
    const r = await tripDistance({ pickup: CAIRO_TAHRIR, dropoff: NASR_CITY, customerKm: 0.5 }, { key: null });
    expect(r).toMatchObject({ ok: true, source: "straight", km: straightLineKm(CAIRO_TAHRIR, NASR_CITY) });
    expect(r.ok && r.km).toBeGreaterThan(10);
  });

  it("keeps the typed km only when there are no pins (plain fields, no Maps key)", async () => {
    expect(await tripDistance({ customerKm: 7.25 }, { key: null })).toMatchObject({ ok: true, km: 7.3, source: "customer" });
    expect(await tripDistance({}, { key: null })).toEqual({ ok: false, reason: "NO_POINTS" });
  });
});

describe("inEgypt", () => {
  it("accepts Egyptian cities and rejects elsewhere", () => {
    for (const p of [CAIRO_TAHRIR, ALEXANDRIA, { lat: 24.09, lng: 32.9 } /* Aswan */, { lat: 27.9, lng: 34.33 } /* Sharm */])
      expect(inEgypt(p)).toBe(true);
    expect(inEgypt({ lat: 48.85, lng: 2.35 })).toBe(false);
    expect(inEgypt({ lat: Number.NaN, lng: 31 })).toBe(false);
  });
});
