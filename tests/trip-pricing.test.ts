import { describe, it, expect } from "vitest";
import { computeTripPrice, type TripInput } from "@/engines/trip-pricing";

const flatMove: TripInput = {
  vehicleId: "van-l",
  km: 40,
  driveMinutes: 55,
  load: "flat2",
  helpers: 3,
  pickup: { floor: 4, elevator: false },
  dropoff: { floor: 2, elevator: true },
  assemblyBoth: 2,
  surgeId: "weekend",
};

const amount = (r: ReturnType<typeof computeTripPrice>, key: string) =>
  r.quote.lines.find((l) => l.key === key)?.amount ?? 0;

describe("computeTripPrice", () => {
  it("prices the 2-bedroom example at a locked 3,990 EGP", () => {
    const r = computeTripPrice(flatMove);
    expect(r.jobMinutes).toBe(226);
    expect(amount(r, "base")).toBe(80000);
    expect(amount(r, "km")).toBe(52500);
    expect(amount(r, "time")).toBe(48000);
    expect(amount(r, "surge")).toBe(18100);
    expect(amount(r, "helpers")).toBe(90000);
    expect(amount(r, "floors-a")).toBe(60000);
    expect(amount(r, "floors-b")).toBe(0);
    expect(amount(r, "assembly")).toBe(50000);
    expect(r.quote.total).toBe(399000);
  });

  it("charges the base fare as a minimum for a short trip", () => {
    const r = computeTripPrice({
      vehicleId: "van-s",
      km: 3,
      driveMinutes: 10,
      load: "few",
      helpers: 0,
      pickup: { floor: 0, elevator: false },
      dropoff: { floor: 0, elevator: false },
    });
    expect(r.quote.total).toBe(35000);
  });

  it("applies discount then VAT, and surge only to the truck part", () => {
    const r = computeTripPrice({ ...flatMove, discountPct: 10, withVat: true });
    expect(r.quote.discount).toBe(39900);
    expect(r.quote.vat).toBe(Math.round((399000 - 39900) * 0.14));
    expect(r.quote.total).toBe(359100 + Math.round(359100 * 0.14));
  });

  it("adds the empty return leg for intercity trips", () => {
    const r = computeTripPrice({ ...flatMove, km: 220, driveMinutes: 180 });
    expect(amount(r, "return")).toBe(110 * 15 * 100);
  });

  it("caps helpers at the vehicle maximum", () => {
    const r = computeTripPrice({ ...flatMove, vehicleId: "van-s", helpers: 5 });
    expect(amount(r, "helpers")).toBe(60000);
  });
});
