import { describe, expect, it } from "vitest";
import { computeDeliveryQuote } from "@/engines/pricing";
import { DEFAULT_PRICING_RULES as R, stairFloors, surgeFor } from "@/engines/trip-rules";
import { cairoDateTime } from "@/lib/time";

const NO_VAT = { vatRate: 0 };
const van = {
  baseFare: 35000,
  perKm: 800,
  loaderFeePerPerson: 0,
  includedKm: 5,
  includedMinutes: 120,
  perExtraHalfHour: 6000,
};

describe("day/time multipliers (highest one wins)", () => {
  const now = cairoDateTime("2026-11-21", 9); // Saturday morning
  it("normal weekday, booked ahead = none", () => {
    expect(surgeFor(cairoDateTime("2026-11-24", 12), now, R)).toBeNull(); // Tuesday 24th, noon
  });
  it("Friday = 1.1", () => {
    expect(surgeFor(cairoDateTime("2026-11-20", 12), cairoDateTime("2026-11-10", 9), R)?.mult).toBe(1.1);
  });
  it("first / last 3 days of the month = 1.15 (beats weekend)", () => {
    expect(surgeFor(cairoDateTime("2026-11-28", 12), now, R)?.key).toBe("monthEdge"); // Saturday 28th
    expect(surgeFor(cairoDateTime("2026-12-02", 12), now, R)?.mult).toBe(1.15);
  });
  it("less than 3 hours ahead = 1.2", () => {
    expect(surgeFor(cairoDateTime("2026-11-24", 11), cairoDateTime("2026-11-24", 9), R)?.key).toBe("sameDay");
  });
  it("night 10 pm – 7 am = 1.2", () => {
    expect(surgeFor(cairoDateTime("2026-11-24", 23), now, R)?.key).toBe("night");
    expect(surgeFor(cairoDateTime("2026-11-24", 6), now, R)?.key).toBe("night");
    expect(surgeFor(cairoDateTime("2026-11-24", 7), now, R)).toBeNull();
  });
  it("holiday dates from the admin list = 1.25", () => {
    const rules = { ...R, holidayDates: ["2026-11-24"] };
    expect(surgeFor(cairoDateTime("2026-11-24", 12), now, rules)?.mult).toBe(1.25);
  });
});

describe("full trip formula", () => {
  it("floors without elevator are charged per floor by load size, not multiplied", () => {
    // van, 20 km, 3h, Friday (1.1), 2-bedroom flat: 3rd floor no elevator → ground floor
    // truck: 350 + 15×8 + 2×60 = 590 × 1.1 = 649; floors: 3 × 150 = 450 → 1099 EGP
    const q = computeDeliveryQuote(
      {
        km: 20,
        minutes: 180,
        surge: { mult: 1.1, labelAr: "جمعة أو سبت" },
        floors: { pickup: stairFloors(3, false), dropoff: stairFloors(0, false), perFloor: R.floorFees.flat2 },
      },
      van,
      NO_VAT,
    );
    expect(q.lines.find((l) => l.key === "surge")?.amount).toBe(5900);
    expect(q.lines.find((l) => l.key === "floors-a")?.amount).toBe(45000);
    expect(q.total).toBe(109900);
    expect(q.surge?.mult).toBe(1.1);
  });

  it("an elevator means no floor fee", () => {
    expect(stairFloors(7, true)).toBe(0);
  });
});
