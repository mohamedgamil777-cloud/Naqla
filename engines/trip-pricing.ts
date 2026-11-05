/**
 * TRIP PRICING (moving / A→B with helpers) — pure and testable.
 *
 * One locked price built from two parts:
 *   Truck = (base + km + extra time) × surge        (surge on the truck part only)
 *   Work  = helpers + floors without elevator + extras
 * Total = round up to 10 EGP, then discount, then VAT.
 *
 * Rates are in EGP (whole pounds); the returned Quote is in piastres so it can
 * be shown with the shared PriceBreakdown component.
 */
import type { Quote, QuoteLine } from "@/engines/pricing";

export interface TripVehicleRates {
  id: string;
  nameAr: string;
  /** Base fare = minimum fare; covers the first `includedKm` and `includedMinutes`. */
  baseFare: number;
  perKm: number;
  /** Price per extra 30-minute block of job time. */
  per30Min: number;
  maxHelpers: number;
}

export type LoadSize = "few" | "room" | "flat2" | "flat3";

export interface LoadPreset {
  labelAr: string;
  loadingMinutes: number;
  /** Price per floor carried by stairs (no usable elevator), per end. */
  perFloor: number;
  suggestedHelpers: number;
}

export interface SurgeOption {
  id: string;
  labelAr: string;
  multiplier: number;
}

export interface TripRates {
  vehicles: TripVehicleRates[];
  loads: Record<LoadSize, LoadPreset>;
  includedKm: number;
  includedMinutes: number;
  /** Safety buffer added to the estimated job time (0.1 = 10%). */
  timeBuffer: number;
  /** Over this distance the empty return trip is charged. */
  intercityKm: number;
  /** Share of one-way km charged for the empty return trip. */
  returnShare: number;
  helperFee: number;
  helperIncludedHours: number;
  helperExtraHour: number;
  heavyItemFee: number;
  heavyItemPerFloor: number;
  assemblyBoth: number;
  assemblyOne: number;
  extraStopFee: number;
  freeWaitMinutes: number;
  longCarryPerHelper: number;
  boxPrice: number;
  wrapRollPrice: number;
  protectionRate: number;
  protectionMin: number;
  surgeCap: number;
  surges: SurgeOption[];
  roundTo: number;
  vatRate: number;
}

export const DEFAULT_TRIP_RATES: TripRates = {
  vehicles: [
    { id: "van-s", nameAr: "فان صغير", baseFare: 350, perKm: 8, per30Min: 60, maxHelpers: 2 },
    { id: "dabbaba", nameAr: "دبابه", baseFare: 550, perKm: 12, per30Min: 90, maxHelpers: 3 },
    { id: "van-l", nameAr: "فان كبير / جامبو", baseFare: 800, perKm: 15, per30Min: 120, maxHelpers: 4 },
  ],
  loads: {
    few: { labelAr: "حاجات قليلة", loadingMinutes: 30, perFloor: 25, suggestedHelpers: 1 },
    room: { labelAr: "أوضة واحدة", loadingMinutes: 60, perFloor: 50, suggestedHelpers: 2 },
    flat2: { labelAr: "شقة أوضتين", loadingMinutes: 90, perFloor: 150, suggestedHelpers: 3 },
    flat3: { labelAr: "شقة 3 أوض أو أكبر", loadingMinutes: 120, perFloor: 200, suggestedHelpers: 4 },
  },
  includedKm: 5,
  includedMinutes: 120,
  timeBuffer: 0.1,
  intercityKm: 100,
  returnShare: 0.5,
  helperFee: 300,
  helperIncludedHours: 4,
  helperExtraHour: 75,
  heavyItemFee: 150,
  heavyItemPerFloor: 50,
  assemblyBoth: 250,
  assemblyOne: 150,
  extraStopFee: 100,
  freeWaitMinutes: 15,
  longCarryPerHelper: 50,
  boxPrice: 30,
  wrapRollPrice: 150,
  protectionRate: 0.01,
  protectionMin: 100,
  surgeCap: 1.3,
  surges: [
    { id: "normal", labelAr: "يوم عادي", multiplier: 1 },
    { id: "flex", labelAr: "يوم مرن (أحد–أربعاء الضهر)", multiplier: 0.9 },
    { id: "weekend", labelAr: "جمعة أو سبت", multiplier: 1.1 },
    { id: "month-edge", labelAr: "أول أو آخر 3 أيام في الشهر", multiplier: 1.15 },
    { id: "same-day", labelAr: "حجز في نفس اليوم (أقل من 3 ساعات)", multiplier: 1.2 },
    { id: "night", labelAr: "بالليل (10م – 7ص)", multiplier: 1.2 },
    { id: "holiday", labelAr: "قبل العيد / الأجازات", multiplier: 1.25 },
  ],
  roundTo: 10,
  vatRate: 0.14,
};

export interface TripEnd {
  floor: number;
  /** A usable elevator that fits the big items. */
  elevator: boolean;
}

export interface TripInput {
  vehicleId: string;
  km: number;
  driveMinutes: number;
  load: LoadSize;
  helpers: number;
  pickup: TripEnd;
  dropoff: TripEnd;
  heavyItems?: number;
  assemblyBoth?: number;
  assemblyOne?: number;
  extraStops?: number;
  /** Expected waiting caused by the customer, in minutes. */
  waitMinutes?: number;
  longCarry?: boolean;
  boxes?: number;
  wrapRolls?: number;
  /** Declared goods value for optional protection; 0 = none. */
  declaredValue?: number;
  surgeId?: string;
  discountPct?: number;
  withVat?: boolean;
}

export interface TripResult {
  quote: Quote;
  jobMinutes: number;
  truck: number;
  work: number;
}

const toP = (egp: number) => Math.round(egp * 100);
const n = (v: number | undefined) => (Number.isFinite(v) && (v as number) > 0 ? (v as number) : 0);
const int = (v: number | undefined) => Math.floor(n(v));

/** Floors carried by stairs at one end (ground floor or a usable elevator = 0). */
function stairFloors(end: TripEnd): number {
  return end.elevator ? 0 : int(end.floor);
}

export function computeTripPrice(input: TripInput, rates: TripRates = DEFAULT_TRIP_RATES): TripResult {
  const v = rates.vehicles.find((x) => x.id === input.vehicleId);
  if (!v) throw new Error("UNKNOWN_VEHICLE");
  const load = rates.loads[input.load];
  if (!load) throw new Error("UNKNOWN_LOAD");

  const lines: QuoteLine[] = [];
  const add = (key: string, labelAr: string, egp: number) => {
    if (egp > 0) lines.push({ key, labelAr, amount: toP(egp) });
    return egp;
  };

  // ── Truck part ───────────────────────────────────────────────
  const km = n(input.km);
  const helpers = Math.min(int(input.helpers), v.maxHelpers);
  const loading = load.loadingMinutes;
  const unloading = Math.round((loading * 2) / 3);
  const wait = Math.max(0, n(input.waitMinutes) - rates.freeWaitMinutes);
  const jobMinutes = Math.ceil((loading + n(input.driveMinutes) + unloading) * (1 + rates.timeBuffer)) + wait;

  let truck = add(
    "base",
    `سعر العربية (${v.nameAr}) — أول ${rates.includedKm} كم و${rates.includedMinutes / 60} ساعة`,
    v.baseFare,
  );
  const extraKm = Math.max(0, km - rates.includedKm);
  truck += add("km", `المسافة (${extraKm} كم × ${v.perKm})`, Math.round(extraKm * v.perKm));
  if (km > rates.intercityKm) {
    const back = Math.round(km * rates.returnShare);
    truck += add("return", `رجوع العربية فاضية (${back} كم × ${v.perKm})`, back * v.perKm);
  }
  const extraBlocks = Math.ceil(Math.max(0, jobMinutes - rates.includedMinutes) / 30);
  truck += add("time", `وقت إضافي (${extraBlocks} × نص ساعة)`, extraBlocks * v.per30Min);

  const surge = rates.surges.find((s) => s.id === (input.surgeId ?? "normal")) ?? rates.surges[0];
  const mult = Math.min(rates.surgeCap, surge.multiplier);
  const surgeAmt = Math.round(truck * mult) - truck;
  if (surgeAmt > 0)
    lines.push({
      key: "surge",
      labelAr: `${surge.labelAr} (+${Math.round((mult - 1) * 100)}%)`,
      amount: toP(surgeAmt),
    });
  if (surgeAmt < 0)
    lines.push({
      key: "surge",
      labelAr: `${surge.labelAr} (−${Math.round((1 - mult) * 100)}%)`,
      amount: toP(surgeAmt),
    });
  truck += surgeAmt;

  // ── Work part ────────────────────────────────────────────────
  let work = 0;
  if (helpers > 0) {
    const extraHours = Math.max(0, Math.ceil(jobMinutes / 60) - rates.helperIncludedHours);
    work += add("helpers", `العمالة (${helpers} × ${rates.helperFee})`, helpers * rates.helperFee);
    work += add(
      "helpers-extra",
      `ساعات عمالة إضافية (${helpers} × ${extraHours} ساعة)`,
      helpers * extraHours * rates.helperExtraHour,
    );
  }
  const fp = stairFloors(input.pickup);
  const fd = stairFloors(input.dropoff);
  work += add("floors-a", `أدوار من غير أسانسير — التحميل (${fp} × ${load.perFloor})`, fp * load.perFloor);
  work += add("floors-b", `أدوار من غير أسانسير — التنزيل (${fd} × ${load.perFloor})`, fd * load.perFloor);
  const heavy = int(input.heavyItems);
  if (heavy > 0) {
    work += add(
      "heavy",
      `قطع تقيلة (${heavy})`,
      heavy * (rates.heavyItemFee + (fp + fd) * rates.heavyItemPerFloor),
    );
  }
  work += add(
    "assembly",
    `فك وتركيب (${int(input.assemblyBoth)} قطعة)`,
    int(input.assemblyBoth) * rates.assemblyBoth,
  );
  work += add(
    "assembly-one",
    `فك أو تركيب بس (${int(input.assemblyOne)} قطعة)`,
    int(input.assemblyOne) * rates.assemblyOne,
  );
  work += add("stops", `محطات إضافية (${int(input.extraStops)})`, int(input.extraStops) * rates.extraStopFee);
  if (input.longCarry)
    work += add("carry", "شيل لمسافة طويلة (أكتر من 30 متر)", helpers * rates.longCarryPerHelper);
  work += add("boxes", `كراتين (${int(input.boxes)})`, int(input.boxes) * rates.boxPrice);
  work += add("wrap", `استرتش (${int(input.wrapRolls)} رول)`, int(input.wrapRolls) * rates.wrapRollPrice);
  const declared = n(input.declaredValue);
  if (declared > 0) {
    work += add(
      "protection",
      "تأمين على البضاعة",
      Math.max(rates.protectionMin, Math.round(declared * rates.protectionRate)),
    );
  }

  // ── Totals ───────────────────────────────────────────────────
  const raw = truck + work;
  const subtotalEgp = Math.ceil(raw / rates.roundTo) * rates.roundTo;
  if (subtotalEgp > raw) lines.push({ key: "round", labelAr: "تقريب", amount: toP(subtotalEgp - raw) });

  const pct = Math.min(100, n(input.discountPct));
  const discountEgp = Math.round((subtotalEgp * pct) / 100);
  if (discountEgp > 0) lines.push({ key: "discount", labelAr: `خصم (${pct}%)`, amount: -toP(discountEgp) });

  const taxable = toP(subtotalEgp - discountEgp);
  const vat = input.withVat ? Math.round(taxable * rates.vatRate) : 0;
  if (vat > 0)
    lines.push({
      key: "vat",
      labelAr: `ضريبة القيمة المضافة (${Math.round(rates.vatRate * 100)}%)`,
      amount: vat,
    });

  return {
    quote: {
      hours: Math.round((jobMinutes / 60) * 10) / 10,
      lines,
      subtotal: toP(subtotalEgp),
      discount: toP(discountEgp),
      vat,
      total: taxable + vat,
      deposit: 0,
      currency: "EGP",
    },
    jobMinutes,
    truck,
    work,
  };
}
