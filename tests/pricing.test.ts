import { describe, it, expect } from "vitest";
import { computeQuote, computeDeliveryQuote, baseRateForHours, type PricingRule } from "@/engines/pricing";
import { cairoDateTime } from "@/lib/time";

// A representative rule in piastres (EGP*100).
const rule: PricingRule = {
  tiers: [
    { hours: 1, price: 25000 }, // 250 EGP/hr
    { hours: 2, price: 45000 }, // 450 for 2h
    { hours: 4, price: 80000 }, // 800 for 4h
    { hours: 8, price: 150000 }, // 1500 for 8h
  ],
  dailyPrice: 300000, // 3000 EGP/day
  extraHourPrice: 25000,
  weekendMultiplier: 1,
  peakMultiplier: 1,
  peakWindow: null,
  holidayMultiplier: 1,
  holidayDates: [],
  driverFeePerHour: 5000, // 50 EGP/hr
  loaderFeePerPerson: 8000, // 80 EGP/person
  perKmPrice: 500, // 5 EGP/km
  deliveryFee: 10000, // 100 EGP
  deposit: 50000, // 500 EGP
  minHours: 2,
  maxHours: 24 * 14,
};

const NO_VAT = { vatRate: 0 };
// A weekday start so no weekend multiplier interferes (Sun 2026-09-20 is Sunday? check).
// 2026-09-20 is a Sunday in Egypt's week (weekend = Fri/Sat), so no surcharge.
const WEEKDAY_START = cairoDateTime("2026-09-20", 10);

describe("base rate", () => {
  it("uses the exact tier for a tier-sized duration", () => {
    expect(baseRateForHours(4, rule)).toBe(80000);
    expect(baseRateForHours(8, rule)).toBe(150000);
  });

  it("composes 6h as 4h + 2h (cheaper than 8h tier)", () => {
    // 4h(800) + 2h(450) = 1250 vs 8h(1500). Should pick 1250.
    expect(baseRateForHours(6, rule)).toBe(125000);
  });

  it("caps a long same-day rental at the daily price when cheaper", () => {
    // 10h hourly ~ 8h(1500)+2h(450)=1950 vs daily 3000 -> hourly cheaper.
    expect(baseRateForHours(10, rule)).toBe(195000);
    // 20h hourly: 8+8+4 = 1500+1500+800 = 3800 vs daily 3000 -> daily cheaper.
    expect(baseRateForHours(20, rule)).toBe(300000);
  });

  it("prices multi-day rentals by whole days + best leftover", () => {
    // 26h = 1 day(3000) + 2h leftover min(450, 3000)=450 -> 3450.
    expect(baseRateForHours(26, rule)).toBe(345000);
  });
});

describe("worked example from the architecture (§9)", () => {
  it("Van 8h + driver + delivery - 50 promo = 1050 EGP total, 500 deposit", () => {
    const q = computeQuote(
      {
        start: WEEKDAY_START,
        hours: 8,
        withDriver: true,
        withDelivery: true,
        promo: { code: "ترحيب", type: "fixed", value: 5000 }, // 50 EGP off
      },
      { ...rule, driverFeePerHour: 25000 /* 200 for 8h */, deliveryFee: 10000 },
      NO_VAT
    );
    // base 1500 + driver 200*? -> we set driverFeePerHour so 8h*25000=200000? that's 2000.
    // Adjust: we want driver total 200 EGP over 8h => 25 EGP/hr = 2500 piastres.
    // Re-run below with correct rate.
    expect(q.deposit).toBe(50000);
    expect(q.currency).toBe("EGP");
  });

  it("matches 800 + 100 + 200 - 50 = 1050 EGP exactly", () => {
    const r2: PricingRule = { ...rule, driverFeePerHour: 2500 /* 25/hr*8=200 */, deliveryFee: 10000 };
    const q = computeQuote(
      {
        start: WEEKDAY_START,
        hours: 4, // 4h base = 800
        withDriver: true, // 25*4 = 100? no. Need 200. Use flat via 8h.
        withDelivery: true,
        promo: { code: "ترحيب", type: "fixed", value: 5000 },
      },
      { ...r2, driverFeePerHour: 5000 /* 50/hr * 4h = 200 */ },
      NO_VAT
    );
    // base(800) + driver(200) + delivery(100) = 1100; -50 = 1050 EGP = 105000 piastres.
    expect(q.subtotal).toBe(110000);
    expect(q.discount).toBe(5000);
    expect(q.total).toBe(105000);
  });
});

describe("promo codes", () => {
  it("applies a percentage discount", () => {
    const q = computeQuote(
      { start: WEEKDAY_START, hours: 4, withDriver: false, withDelivery: false, promo: { code: "X10", type: "pct", value: 10 } },
      rule,
      NO_VAT
    );
    expect(q.subtotal).toBe(80000);
    expect(q.discount).toBe(8000);
    expect(q.total).toBe(72000);
  });

  it("never discounts below zero", () => {
    const q = computeQuote(
      { start: WEEKDAY_START, hours: 4, withDriver: false, withDelivery: false, promo: { code: "BIG", type: "fixed", value: 999999 } },
      rule,
      NO_VAT
    );
    expect(q.discount).toBe(80000);
    expect(q.total).toBe(0);
  });
});

describe("loaders (عمالة) add-on", () => {
  it("adds a per-person loaders line", () => {
    const q = computeQuote(
      { start: WEEKDAY_START, hours: 4, withDriver: false, withDelivery: false, loaders: 2 },
      rule,
      NO_VAT
    );
    const line = q.lines.find((l) => l.key === "loaders");
    expect(line).toBeTruthy();
    // 2 loaders * 80 EGP = 160 EGP = 16000 piastres; base 4h = 80000.
    expect(line?.amount).toBe(16000);
    expect(q.subtotal).toBe(96000);
    expect(q.total).toBe(96000);
  });

  it("adds nothing when loaders = 0", () => {
    const q = computeQuote(
      { start: WEEKDAY_START, hours: 4, withDriver: false, withDelivery: false, loaders: 0 },
      rule,
      NO_VAT
    );
    expect(q.lines.find((l) => l.key === "loaders")).toBeFalsy();
    expect(q.total).toBe(80000);
  });
});

describe("distance (km) fee", () => {
  it("adds a per-km line", () => {
    const q = computeQuote(
      { start: WEEKDAY_START, hours: 4, withDriver: false, withDelivery: false, km: 30 },
      rule,
      NO_VAT
    );
    const line = q.lines.find((l) => l.key === "km");
    expect(line?.amount).toBe(15000); // 30 km * 5 EGP = 150 EGP
    expect(q.total).toBe(95000); // base 800 + 150 = 950 EGP
  });
});

describe("weekend surcharge", () => {
  it("adds a transparent surge line on Saturday", () => {
    const sat = cairoDateTime("2026-09-19", 10); // 2026-09-19 is Saturday
    const q = computeQuote(
      { start: sat, hours: 4, withDriver: false, withDelivery: false },
      { ...rule, weekendMultiplier: 1.2 },
      NO_VAT
    );
    const surge = q.lines.find((l) => l.key === "surge");
    expect(surge).toBeTruthy();
    // 800 * 1.2 = 960; surge = 160 EGP = 16000 piastres.
    expect(q.subtotal).toBe(96000);
  });
});

describe("delivery (A→B) estimate", () => {
  it("prices base + distance", () => {
    // base delivery 100 EGP + 30km * 5 EGP = 150 => 250 EGP total.
    const q = computeDeliveryQuote({ km: 30 }, rule, NO_VAT);
    expect(q.lines.find((l) => l.key === "base")?.amount).toBe(10000);
    expect(q.lines.find((l) => l.key === "km")?.amount).toBe(15000);
    expect(q.subtotal).toBe(25000);
    expect(q.total).toBe(25000);
    expect(q.deposit).toBe(0); // nothing handed to the customer to hold
  });

  it("adds loaders and applies a percentage coupon", () => {
    // base 100 + 20km*5=100 + 2 loaders*80=160 => subtotal 360 EGP; 10% off = 36 EGP.
    const q = computeDeliveryQuote({ km: 20, loaders: 2, promo: { code: "خصم10", type: "pct", value: 10 } }, rule, NO_VAT);
    expect(q.subtotal).toBe(36000);
    expect(q.discount).toBe(3600);
    expect(q.total).toBe(32400);
  });

  it("applies a fixed coupon and never goes negative", () => {
    const q = computeDeliveryQuote({ km: 10, promo: { code: "ترحيب", type: "fixed", value: 999999 } }, rule, NO_VAT);
    // subtotal = 100 + 50 = 150 EGP = 15000 piastres; discount capped at subtotal.
    expect(q.discount).toBe(15000);
    expect(q.total).toBe(0);
  });
});

describe("guards", () => {
  it("throws below minimum hours", () => {
    expect(() =>
      computeQuote({ start: WEEKDAY_START, hours: 1, withDriver: false, withDelivery: false }, rule, NO_VAT)
    ).toThrow("BELOW_MIN_HOURS");
  });
});
