/**
 * PRICING ENGINE — pure, server-only, fully testable.
 *
 * Given a resolved pricing rule + rental context, it returns an itemized
 * breakdown in PIASTRES. This is the ONLY place prices are computed. The client
 * never sends a price; the server always recomputes here (architecture §9, §35).
 *
 * Rule resolution (vehicle -> category -> global) happens in the data layer;
 * this function receives the already-resolved rule.
 */
import type { Piastres } from "@/lib/money";
import { cairoDateISO, cairoHour, cairoWeekday } from "@/lib/time";

export interface Tier {
  hours: number;
  price: Piastres;
}

export interface PricingRule {
  /** Hour tiers, e.g. [{hours:1,price:25000},{hours:2,...},{hours:4,...},{hours:8,...}]. */
  tiers: Tier[];
  /** Full 24h price — the "daily" cap. */
  dailyPrice: Piastres;
  /** Price per hour for leftover hours not covered by a tier. */
  extraHourPrice: Piastres;
  /** Multiplier applied on weekends (Fri/Sat in Egypt). 1 = no change. */
  weekendMultiplier: number;
  /** Multiplier applied during peak hours. 1 = no change. */
  peakMultiplier: number;
  /** Peak hour window [from,to) in Cairo hours; null = no peak window. */
  peakWindow: { from: number; to: number } | null;
  /** Multiplier applied on holiday dates. 1 = no change. */
  holidayMultiplier: number;
  /** ISO dates (YYYY-MM-DD) treated as holidays. */
  holidayDates: string[];
  /** Driver fee per hour (piastres). */
  driverFeePerHour: Piastres;
  /** Fee per loader/helper (عمالة) for the whole job (piastres per person). */
  loaderFeePerPerson: Piastres;
  /** Price per kilometer (piastres) — used for distance-based fees/settlement. */
  perKmPrice: Piastres;
  /** Flat delivery fee (piastres) when delivered to the customer. */
  deliveryFee: Piastres;
  /** Refundable deposit (piastres). */
  deposit: Piastres;
  minHours: number;
  maxHours: number;
}

export interface PromoInput {
  code: string;
  type: "pct" | "fixed";
  /** pct: percent 0-100; fixed: piastres. */
  value: number;
}

export interface QuoteInput {
  start: Date;
  hours: number;
  withDriver: boolean;
  withDelivery: boolean;
  /** Number of loaders/helpers (عمالة) requested. 0 = none. */
  loaders?: number;
  /** Kilometers driven/estimated — adds a distance line when > 0. */
  km?: number;
  promo?: PromoInput | null;
}

export interface QuoteLine {
  key: string;
  labelAr: string;
  amount: Piastres; // may be negative (discount)
}

export interface Quote {
  hours: number;
  lines: QuoteLine[];
  subtotal: Piastres; // rental + add-ons, before discount
  discount: Piastres; // >= 0
  vat: Piastres;
  total: Piastres; // amount due now (excludes refundable deposit)
  deposit: Piastres;
  currency: "EGP";
}

export interface DeliveryQuoteInput {
  /** Estimated trip distance in kilometers (A→B). */
  km: number;
  /** Number of loaders/helpers (عمالة) requested. 0 = none. */
  loaders?: number;
  promo?: PromoInput | null;
}

/**
 * Distance-based A→B delivery estimate (qMove-style). Unlike the time-based
 * rental quote, this is a flat pickup fee + per-km distance + optional loaders,
 * with the same promo/VAT handling. No refundable deposit (nothing is handed to
 * the customer to hold). Pure & testable — the server is authoritative.
 */
export function computeDeliveryQuote(
  input: DeliveryQuoteInput,
  rule: PricingRule,
  opts: PricingOptions
): Quote {
  const lines: QuoteLine[] = [];

  // 1. Flat base pickup/dispatch fee (reuses the rule's delivery fee).
  const base = rule.deliveryFee;
  lines.push({ key: "base", labelAr: "رسوم التوصيل الأساسية", amount: base });

  // 2. Distance.
  let addons = 0;
  const km = Math.max(0, input.km ?? 0);
  if (km > 0 && rule.perKmPrice > 0) {
    const kmCost = Math.round(km * rule.perKmPrice);
    addons += kmCost;
    lines.push({ key: "km", labelAr: `المسافة (${km} كم)`, amount: kmCost });
  }

  // 3. Loaders.
  const loaders = Math.max(0, Math.floor(input.loaders ?? 0));
  if (loaders > 0 && rule.loaderFeePerPerson > 0) {
    const loaderCost = loaders * rule.loaderFeePerPerson;
    addons += loaderCost;
    lines.push({ key: "loaders", labelAr: `العمالة (${loaders} ${loaders === 1 ? "فرد" : "أفراد"})`, amount: loaderCost });
  }

  const subtotal = base + addons;

  // 4. Discount (promo).
  let discount = 0;
  if (input.promo) {
    if (input.promo.type === "pct") {
      discount = Math.round((subtotal * Math.min(100, Math.max(0, input.promo.value))) / 100);
    } else {
      discount = Math.min(subtotal, Math.max(0, input.promo.value));
    }
    if (discount > 0) {
      lines.push({ key: "discount", labelAr: `الخصم (${input.promo.code})`, amount: -discount });
    }
  }

  // 5. VAT on (subtotal - discount).
  const taxable = subtotal - discount;
  const vat = opts.vatRate > 0 ? Math.round(taxable * opts.vatRate) : 0;
  if (vat > 0) lines.push({ key: "vat", labelAr: "ضريبة القيمة المضافة", amount: vat });

  return {
    hours: 0,
    lines,
    subtotal,
    discount,
    vat,
    total: taxable + vat,
    deposit: 0,
    currency: "EGP",
  };
}

/** Cheapest composition of `hours` using the available tiers + extra-hour rate. */
function tierComposed(hours: number, rule: PricingRule): Piastres {
  if (hours <= 0) return 0;
  const tiers = [...rule.tiers].sort((a, b) => b.hours - a.hours);
  let remaining = hours;
  let cost = 0;
  for (const t of tiers) {
    while (remaining >= t.hours) {
      cost += t.price;
      remaining -= t.hours;
    }
  }
  cost += remaining * rule.extraHourPrice;
  return cost;
}

/**
 * Base rate for N hours: the cheaper of a pure hourly composition vs. a
 * day-based composition (architecture §14.4 — customer always gets best price).
 */
export function baseRateForHours(hours: number, rule: PricingRule): Piastres {
  const hourly = tierComposed(hours, rule);
  const days = Math.floor(hours / 24);
  const rem = hours - days * 24;
  const dayBased =
    days * rule.dailyPrice +
    (rem > 0 ? Math.min(tierComposed(rem, rule), rule.dailyPrice) : 0);
  return Math.min(hourly, dayBased);
}

/** The applicable time multiplier for a rental starting at `start`. */
export function timeMultiplier(start: Date, rule: PricingRule): { mult: number; reason: string | null } {
  const candidates: { mult: number; reason: string }[] = [];
  const dateISO = cairoDateISO(start);
  const weekday = cairoWeekday(start); // 5=Fri, 6=Sat
  const hour = cairoHour(start);

  if (rule.holidayDates.includes(dateISO) && rule.holidayMultiplier !== 1) {
    candidates.push({ mult: rule.holidayMultiplier, reason: "سعر أجازة" });
  }
  if ((weekday === 5 || weekday === 6) && rule.weekendMultiplier !== 1) {
    candidates.push({ mult: rule.weekendMultiplier, reason: "سعر نهاية الأسبوع" });
  }
  if (
    rule.peakWindow &&
    rule.peakMultiplier !== 1 &&
    hour >= rule.peakWindow.from &&
    hour < rule.peakWindow.to
  ) {
    candidates.push({ mult: rule.peakMultiplier, reason: "سعر وقت الذروة" });
  }
  if (candidates.length === 0) return { mult: 1, reason: null };
  // Take the single highest applicable multiplier (no runaway stacking).
  const best = candidates.reduce((a, b) => (b.mult > a.mult ? b : a));
  return { mult: best.mult, reason: best.reason };
}

export interface PricingOptions {
  vatRate: number; // 0..1
}

/** Compute the full itemized quote. Throws on invalid duration. */
export function computeQuote(
  input: QuoteInput,
  rule: PricingRule,
  opts: PricingOptions
): Quote {
  const { hours } = input;
  if (hours < rule.minHours) throw new Error("BELOW_MIN_HOURS");
  if (hours > rule.maxHours) throw new Error("ABOVE_MAX_HOURS");

  const lines: QuoteLine[] = [];

  // 1. Base rate.
  const base = baseRateForHours(hours, rule);

  // 2. Time multiplier (weekend/peak/holiday).
  const { mult, reason } = timeMultiplier(input.start, rule);
  const basePriced = Math.round(base * mult);
  lines.push({ key: "base", labelAr: "سعر العربية", amount: basePriced });
  if (mult !== 1 && reason) {
    // Show the surcharge as its own transparent line.
    lines.push({ key: "surge", labelAr: reason, amount: basePriced - base });
    // Keep base line at the raw base for clarity.
    lines[0].amount = base;
  }

  // 3. Add-ons.
  let addons = 0;
  if (input.withDriver) {
    const driver = rule.driverFeePerHour * hours;
    addons += driver;
    lines.push({ key: "driver", labelAr: "السائق", amount: driver });
  }
  if (input.withDelivery) {
    addons += rule.deliveryFee;
    lines.push({ key: "delivery", labelAr: "التوصيل", amount: rule.deliveryFee });
  }
  const loaders = Math.max(0, Math.floor(input.loaders ?? 0));
  if (loaders > 0 && rule.loaderFeePerPerson > 0) {
    const loaderCost = loaders * rule.loaderFeePerPerson;
    addons += loaderCost;
    lines.push({ key: "loaders", labelAr: `العمالة (${loaders} ${loaders === 1 ? "فرد" : "أفراد"})`, amount: loaderCost });
  }
  const km = Math.max(0, input.km ?? 0);
  if (km > 0 && rule.perKmPrice > 0) {
    const kmCost = Math.round(km * rule.perKmPrice);
    addons += kmCost;
    lines.push({ key: "km", labelAr: `المسافة (${km} كم)`, amount: kmCost });
  }

  const subtotal = basePriced + addons;

  // 4. Discount (promo).
  let discount = 0;
  if (input.promo) {
    if (input.promo.type === "pct") {
      discount = Math.round((subtotal * Math.min(100, Math.max(0, input.promo.value))) / 100);
    } else {
      discount = Math.min(subtotal, Math.max(0, input.promo.value));
    }
    if (discount > 0) {
      lines.push({ key: "discount", labelAr: `الخصم (${input.promo.code})`, amount: -discount });
    }
  }

  // 5. VAT on (subtotal - discount).
  const taxable = subtotal - discount;
  const vat = opts.vatRate > 0 ? Math.round(taxable * opts.vatRate) : 0;
  if (vat > 0) lines.push({ key: "vat", labelAr: "ضريبة القيمة المضافة", amount: vat });

  const total = taxable + vat;

  return {
    hours,
    lines,
    subtotal,
    discount,
    vat,
    total,
    deposit: rule.deposit,
    currency: "EGP",
  };
}
