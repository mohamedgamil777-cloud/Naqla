/**
 * Trip price rules on top of the vehicle rates (Mohamed's Pricing sheet, 2026-11-21):
 *  - floors carried by stairs (no elevator): a fee per floor that depends on the load size;
 *  - day/time multipliers (weekend, lease-moving days, same-day, night, holidays).
 * Only the HIGHEST multiplier that applies is used (no stacking), on the truck part
 * (base + km + extra time). Floors and helpers are not multiplied.
 * Pure and testable: the admin-editable values come in as `PricingRules`.
 */
import type { Piastres } from "@/lib/money";
import { cairoDateISO, cairoHour, cairoWeekday } from "@/lib/time";

export const LOAD_SIZES = ["few", "room", "flat2", "flat3"] as const;
export type LoadSize = (typeof LOAD_SIZES)[number];

export const LOAD_SIZE_LABEL: Record<LoadSize, string> = {
  few: "حاجات قليلة",
  room: "أوضة واحدة",
  flat2: "شقة أوضتين",
  flat3: "شقة 3 أوض أو أكبر",
};

export type SurgeKey = "weekend" | "monthEdge" | "sameDay" | "night" | "holiday";

export const SURGE_LABEL: Record<SurgeKey, string> = {
  weekend: "جمعة أو سبت",
  monthEdge: "أول أو آخر 3 أيام في الشهر",
  sameDay: "حجز قبل الميعاد بأقل من 3 ساعات",
  night: "بالليل (10م – 7ص)",
  holiday: "قبل العيد / أجازة رسمية",
};

export interface PricingRules {
  /** per floor carried by stairs, at each end (piastres) */
  floorFees: Record<LoadSize, Piastres>;
  /** multipliers; 1 = off */
  surges: Record<SurgeKey, number>;
  /** Cairo dates (YYYY-MM-DD) that get the holiday multiplier */
  holidayDates: string[];
}

export const DEFAULT_PRICING_RULES: PricingRules = {
  floorFees: { few: 2500, room: 5000, flat2: 15000, flat3: 20000 },
  surges: { weekend: 1.1, monthEdge: 1.15, sameDay: 1.2, night: 1.2, holiday: 1.25 },
  holidayDates: [],
};

export interface Surge {
  key: SurgeKey;
  mult: number;
  labelAr: string;
}

/** The highest multiplier that applies to a trip starting at `start`, booked at `now`; null = normal day. */
export function surgeFor(start: Date, now: Date, rules: PricingRules): Surge | null {
  const hits: SurgeKey[] = [];
  const date = cairoDateISO(start);
  const weekday = cairoWeekday(start); // 5 = Friday, 6 = Saturday
  const day = Number(date.slice(8, 10));
  const [y, m] = date.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const hour = cairoHour(start);

  if (rules.holidayDates.includes(date)) hits.push("holiday");
  if (weekday === 5 || weekday === 6) hits.push("weekend");
  if (day <= 3 || day > daysInMonth - 3) hits.push("monthEdge");
  if (start.getTime() - now.getTime() < 3 * 3600e3) hits.push("sameDay");
  if (hour >= 22 || hour < 7) hits.push("night");

  let best: Surge | null = null;
  for (const key of hits) {
    const mult = rules.surges[key];
    if (mult > 1 && (!best || mult > best.mult)) best = { key, mult, labelAr: SURGE_LABEL[key] };
  }
  return best;
}

/** Floors carried by stairs at one end (ground floor or a usable elevator = 0). */
export function stairFloors(floor: number | null | undefined, elevator: boolean | null | undefined): number {
  if (elevator || floor == null || !Number.isFinite(floor)) return 0;
  return Math.max(0, Math.floor(floor));
}

/** Older saved settings may miss fields: fill them from the defaults. */
export function withPricingDefaults(saved: Partial<PricingRules> | null | undefined): PricingRules {
  const d = DEFAULT_PRICING_RULES;
  const s = saved ?? {};
  return {
    floorFees: { ...d.floorFees, ...(s.floorFees ?? {}) },
    surges: { ...d.surges, ...(s.surges ?? {}) },
    holidayDates: Array.isArray(s.holidayDates) ? s.holidayDates : d.holidayDates,
  };
}
