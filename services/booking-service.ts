/**
 * Booking service — the server-authoritative orchestration between the data
 * layer and the pure engines. API routes call these; they never trust client
 * prices or availability.
 */
import { getBusy } from "@/db/lib/availability";
import { getBooking, insertBooking, updateBookingSchedule } from "@/db/lib/bookings";
import { defaultBranch, getBranch } from "@/db/lib/branches";
import { validatePromo } from "@/db/lib/coupons";
import { getBusiness } from "@/db/lib/settings";
import { getVehicle, resolveRule } from "@/db/lib/vehicles";
import {
  availableDurations,
  checkRange,
  hourSlots,
  nearestAlternatives,
  padInterval,
  type AvailabilityContext,
  type Slot,
} from "@/engines/availability";
import { computeQuote, type Quote } from "@/engines/pricing";
import { cairoDateTime, addHours } from "@/lib/time";
import type { CreateBookingInput } from "@/types";

export class ServiceError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

async function buildContext(vehicleId: string): Promise<AvailabilityContext> {
  const v = await getVehicle(vehicleId);
  if (!v) throw new ServiceError("VEHICLE_NOT_FOUND");
  const [branch, business] = await Promise.all([
    getBranch(v.branchId).then((b) => b ?? defaultBranch()),
    getBusiness(),
  ]);
  // only what hasn't ended yet (a day back covers the buffer around a booking ending now)
  const busyRaw = await getBusy(vehicleId, new Date(Date.now() - 24 * 60 * 60 * 1000));
  const busy = busyRaw.map((iv) => padInterval(iv, business.bufferMinutes));
  const bookable = v.status !== "inactive" && v.status !== "maintenance";
  return {
    now: new Date(),
    busy,
    working: branch.working,
    vehicleBookable: bookable,
    minHours: Math.max(v.rule.minHours, business.minHours),
    maxHours: Math.min(v.rule.maxHours, business.maxHours),
    advanceDays: business.advanceDays,
    nowLeadHours: business.nowLeadHours,
    durationOptions: business.durationOptions,
  };
}

/** Hour-by-hour occupancy grid for a Cairo date. */
export async function getDaySlots(vehicleId: string, dateISO: string): Promise<Slot[]> {
  const ctx = await buildContext(vehicleId);
  return hourSlots(dateISO, ctx, cairoDateTime);
}

/** Valid durations for a chosen start instant (ISO string). */
export async function getDurations(vehicleId: string, startISO: string): Promise<number[]> {
  const ctx = await buildContext(vehicleId);
  return availableDurations(new Date(startISO), ctx);
}

/** Server-authoritative quote. Never uses a client-supplied price. */
export async function quote(params: {
  vehicleId: string;
  startISO: string;
  hours: number;
  withDriver: boolean;
  withDelivery: boolean;
  loaders?: number;
  km?: number;
  promoCode?: string | null;
}): Promise<Quote> {
  const [rule, business] = await Promise.all([resolveRule(params.vehicleId), getBusiness()]);
  const start = new Date(params.startISO);
  const baseInput = {
    start,
    hours: params.hours,
    withDriver: params.withDriver,
    withDelivery: params.withDelivery,
    loaders: params.loaders ?? 0,
    km: params.km ?? 0,
    promo: null,
  };
  // First pass (no promo) to learn the subtotal for promo min-value validation.
  const preview = computeQuote(baseInput, rule, { vatRate: business.vatRate });
  let promo = null;
  if (params.promoCode && params.promoCode.trim()) {
    promo = await validatePromo(params.promoCode.trim(), preview.subtotal);
    if (!promo) throw new ServiceError("INVALID_PROMO");
  }
  return computeQuote({ ...baseInput, promo }, rule, { vatRate: business.vatRate });
}

export interface AlternativesResult {
  ok: false;
  reason: string;
  alternatives: { startISO: string; startLabel: string }[];
}

/** Create a booking: re-check availability, re-quote, insert (DB EXCLUDE is the final gate). */
export async function createBooking(input: {
  vehicleId: string;
  startISO: string;
  hours: number;
  withDriver: boolean;
  withDelivery: boolean;
  loaders?: number;
  deliveryAddress?: Record<string, unknown> | null;
  promoCode?: string | null;
  contactName: string;
  contactPhone: string;
  customerId?: string | null;
  source?: "customer" | "agent";
  agentName?: string | null;
}): Promise<{ code: string; quote: Quote } | AlternativesResult> {
  const ctx = await buildContext(input.vehicleId);
  const start = new Date(input.startISO);
  const end = addHours(start, input.hours);

  const check = checkRange(start, end, ctx);
  if (!check.ok) {
    return await alternatives(input.vehicleId, start, input.hours, check.reason ?? "conflict");
  }

  const q = await quote({
    vehicleId: input.vehicleId,
    startISO: input.startISO,
    hours: input.hours,
    withDriver: input.withDriver,
    withDelivery: input.withDelivery,
    loaders: input.loaders ?? 0,
    promoCode: input.promoCode,
  });

  const v = await getVehicle(input.vehicleId);
  const branchId = v!.branchId;

  const createInput: CreateBookingInput = {
    vehicleId: input.vehicleId,
    startsAt: start,
    endsAt: end,
    withDriver: input.withDriver,
    delivery: input.withDelivery,
    loaders: input.loaders ?? 0,
    deliveryAddress: input.deliveryAddress ?? null,
    promoCode: input.promoCode ?? null,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    customerId: input.customerId ?? null,
    source: input.source ?? "customer",
    agentName: input.agentName ?? null,
  };

  try {
    // the coupon use is counted in the same transaction as the booking
    const redeem = input.promoCode && q.discount > 0 ? input.promoCode : null;
    const { code } = await insertBooking(createInput, q, branchId, redeem);
    return { code, quote: q };
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "CONFLICT" || msg === "VEHICLE_BLOCKED") {
      // Lost the race (or a block landed) — offer alternatives.
      return await alternatives(input.vehicleId, start, input.hours, "conflict");
    }
    throw e;
  }
}

/** Extend (or adjust) a trip's duration: re-check availability (excluding this
 *  trip), re-price with its existing add-ons, and update the amount due. */
export async function extendBooking(
  code: string,
  newHours: number,
): Promise<{ ok: true; quote: Quote } | { ok: false; reason: string }> {
  const b = await getBooking(code);
  if (!b) return { ok: false, reason: "not_found" };
  if (b.status === "completed" || b.status === "cancelled") return { ok: false, reason: "closed" };
  if (!Number.isFinite(newHours) || newHours < 1) return { ok: false, reason: "bad_hours" };
  const business = await getBusiness();
  if (newHours > business.maxHours) return { ok: false, reason: "too_long" };

  const start = b.startsAt;
  const newEnd = addHours(start, newHours);

  // Conflict check vs OTHER bookings/blocks (buffer-padded), excluding this trip.
  const since = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const busy = (await getBusy(b.vehicleId, since, code)).map((iv) => padInterval(iv, business.bufferMinutes));
  const conflict = busy.some(
    (iv) => start.getTime() < iv.end.getTime() && iv.start.getTime() < newEnd.getTime(),
  );
  if (conflict) return { ok: false, reason: "conflict" };

  let q: Quote;
  try {
    q = await quote({
      vehicleId: b.vehicleId,
      startISO: start.toISOString(),
      hours: newHours,
      withDriver: b.withDriver,
      withDelivery: b.delivery,
      loaders: b.loaders,
    });
  } catch {
    return { ok: false, reason: "price" };
  }

  try {
    await updateBookingSchedule(code, newEnd, q);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "CONFLICT" || msg === "VEHICLE_BLOCKED") return { ok: false, reason: "conflict" };
    throw e;
  }
  return { ok: true, quote: q };
}

async function alternatives(
  vehicleId: string,
  start: Date,
  hours: number,
  reason: string,
): Promise<AlternativesResult> {
  const ctx = await buildContext(vehicleId);
  const { cairoDateISO, labelDateArabic, labelTime } = await import("@/lib/time");
  const dateISO = cairoDateISO(start);
  const alts = nearestAlternatives(dateISO, hours, ctx, cairoDateTime, 4, 4);
  return {
    ok: false,
    reason,
    alternatives: alts.map((d) => ({
      startISO: d.toISOString(),
      startLabel: `${labelDateArabic(d)} — ${labelTime(d)}`,
    })),
  };
}
