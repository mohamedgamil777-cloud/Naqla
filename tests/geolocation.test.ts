import { describe, expect, it } from "vitest";
import { getMyLocation, LOCATE_ERROR, locateMessage } from "@/lib/geolocation";

const fix = { coords: { latitude: 30.05, longitude: 31.24 } } as GeolocationPosition;
function geo(results: Array<"ok" | 1 | 2 | 3>) {
  const calls: PositionOptions[] = [];
  return {
    calls,
    getCurrentPosition(ok: PositionCallback, fail?: PositionErrorCallback | null, opts?: PositionOptions) {
      calls.push(opts ?? {});
      const r = results.shift();
      if (r === "ok") ok(fix);
      else fail?.({ code: r } as GeolocationPositionError);
    },
  };
}

describe("getMyLocation", () => {
  it("returns the GPS fix", async () => {
    await expect(getMyLocation(geo(["ok"]), true)).resolves.toEqual({ lat: 30.05, lng: 31.24 });
  });
  it("falls back to network location when GPS times out", async () => {
    const g = geo([3, "ok"]);
    await expect(getMyLocation(g, true)).resolves.toEqual({ lat: 30.05, lng: 31.24 });
    expect(g.calls[1].enableHighAccuracy).toBe(false);
  });
  it("does not retry when permission is denied", async () => {
    const g = geo([1]);
    await expect(getMyLocation(g, true)).rejects.toBe("denied");
    expect(g.calls).toHaveLength(1);
  });
  it("reports unavailable / insecure / unsupported", async () => {
    await expect(getMyLocation(geo([2, 2]), true)).rejects.toBe("unavailable");
    await expect(getMyLocation(geo([]), false)).rejects.toBe("insecure");
    await expect(getMyLocation(undefined, true)).rejects.toBe("unsupported");
  });
  it("gives iPhone users iOS settings steps when denied", () => {
    expect(locateMessage("denied", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)")).toContain("الآيفون");
    expect(locateMessage("denied", "Mozilla/5.0 (Linux; Android 14)")).toBe(LOCATE_ERROR.denied);
  });
});
