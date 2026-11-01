/**
 * AVAILABILITY ENGINE — pure, server-only, fully testable.
 *
 * Works over a set of already buffer-padded "busy" intervals (existing bookings
 * + maintenance/blocks). Produces the hour grid, the valid durations for a chosen
 * start, a single availability check, and nearest alternatives (architecture §8).
 *
 * NOTE on the buffer: `busy` intervals passed in are expected to be padded by the
 * buffer on both sides (done by the data layer). The DB EXCLUDE constraint is the
 * ultimate no-overlap gate; this engine enforces the business buffer + working
 * hours + lead time for display and pre-checks.
 */
import { addHours, cairoDateISO, cairoHour, cairoWeekday } from "@/lib/time";

export interface Interval {
  start: Date;
  end: Date;
}

export interface WorkingHours {
  /** Cairo hour the branch opens, e.g. 8. */
  open: number;
  /** Cairo hour the branch closes (last valid return time), e.g. 22. */
  close: number;
}

export interface AvailabilityContext {
  now: Date;
  /** Buffer-padded occupied intervals. */
  busy: Interval[];
  working: WorkingHours;
  /** false when the vehicle is inactive or in maintenance overall. */
  vehicleBookable: boolean;
  minHours: number;
  maxHours: number;
  advanceDays: number;
  nowLeadHours: number;
  durationOptions: number[];
}

export type SlotStatus = "available" | "booked" | "buffer" | "unavailable";

export interface Slot {
  start: Date;
  end: Date;
  hour24: number;
  status: SlotStatus;
}

function overlaps(aS: Date, aE: Date, bS: Date, bE: Date): boolean {
  return aS.getTime() < bE.getTime() && bS.getTime() < aE.getTime();
}

function hitsBusy(start: Date, end: Date, busy: Interval[]): boolean {
  return busy.some((b) => overlaps(start, end, b.start, b.end));
}

export type UnavailableReason =
  | "vehicle_unavailable"
  | "in_past"
  | "too_soon"
  | "too_far"
  | "outside_hours"
  | "below_min"
  | "above_max"
  | "conflict";

export interface AvailabilityResult {
  ok: boolean;
  reason?: UnavailableReason;
}

/** Is a rental [start, end) bookable under the full rule set? */
export function checkRange(start: Date, end: Date, ctx: AvailabilityContext): AvailabilityResult {
  if (!ctx.vehicleBookable) return { ok: false, reason: "vehicle_unavailable" };

  const hours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
  if (hours < ctx.minHours) return { ok: false, reason: "below_min" };
  if (hours > ctx.maxHours) return { ok: false, reason: "above_max" };

  const earliest = new Date(ctx.now.getTime() + ctx.nowLeadHours * 60 * 60 * 1000);
  if (start.getTime() < ctx.now.getTime()) return { ok: false, reason: "in_past" };
  if (start.getTime() < earliest.getTime()) return { ok: false, reason: "too_soon" };

  const latest = new Date(ctx.now.getTime() + ctx.advanceDays * 24 * 60 * 60 * 1000);
  if (start.getTime() > latest.getTime()) return { ok: false, reason: "too_far" };

  // Working hours: pickup and return must both fall within [open, close].
  const startHour = cairoHour(start);
  const endHour = cairoHour(end);
  if (startHour < ctx.working.open || startHour >= ctx.working.close) {
    return { ok: false, reason: "outside_hours" };
  }
  if (endHour < ctx.working.open || endHour > ctx.working.close) {
    return { ok: false, reason: "outside_hours" };
  }

  if (hitsBusy(start, end, ctx.busy)) return { ok: false, reason: "conflict" };

  return { ok: true };
}

/** The hour-by-hour occupancy grid for a Cairo calendar date. */
export function hourSlots(dateISO: string, ctx: AvailabilityContext, cairoDateTime: (d: string, h: number) => Date): Slot[] {
  const slots: Slot[] = [];
  const earliest = new Date(ctx.now.getTime() + ctx.nowLeadHours * 60 * 60 * 1000);
  for (let h = ctx.working.open; h < ctx.working.close; h++) {
    const start = cairoDateTime(dateISO, h);
    const end = addHours(start, 1);
    let status: SlotStatus;
    if (!ctx.vehicleBookable) {
      status = "unavailable";
    } else if (start.getTime() < earliest.getTime()) {
      status = "unavailable"; // in the past or within lead time
    } else if (hitsBusy(start, end, ctx.busy)) {
      status = "booked";
    } else {
      status = "available";
    }
    slots.push({ start, end, hour24: h, status });
  }
  return slots;
}

/** Which of the configured duration options fit starting at `start`. */
export function availableDurations(start: Date, ctx: AvailabilityContext): number[] {
  const opts = [...ctx.durationOptions].sort((a, b) => a - b);
  const out: number[] = [];
  for (const d of opts) {
    if (d < ctx.minHours || d > ctx.maxHours) continue;
    const end = addHours(start, d);
    if (checkRange(start, end, ctx).ok) out.push(d);
    // Not breaking early: a valid gap could reopen after working-hours edge cases;
    // options are few so exhaustive checking is cheap and correct.
  }
  return out;
}

/**
 * Nearest alternative start times when the desired slot is unavailable.
 * Scans hourly starts across up to `daysAhead` days for ones where a rental of
 * `hours` (falling back to minHours) fits.
 */
export function nearestAlternatives(
  fromDateISO: string,
  hours: number,
  ctx: AvailabilityContext,
  cairoDateTime: (d: string, h: number) => Date,
  count = 3,
  daysAhead = 3
): Date[] {
  const wanted = Math.max(hours, ctx.minHours);
  const results: Date[] = [];
  const [y, m, d] = fromDateISO.split("-").map(Number);
  for (let dayOffset = 0; dayOffset < daysAhead && results.length < count; dayOffset++) {
    const dayDate = new Date(Date.UTC(y, m - 1, d + dayOffset));
    const dateISO = cairoDateISO(dayDate);
    for (let h = ctx.working.open; h < ctx.working.close; h++) {
      const start = cairoDateTime(dateISO, h);
      const end = addHours(start, wanted);
      if (checkRange(start, end, ctx).ok) {
        results.push(start);
        if (results.length >= count) break;
      }
    }
  }
  return results;
}

/** Pad a raw occupied interval by the buffer on both sides. */
export function padInterval(iv: Interval, bufferMinutes: number): Interval {
  const ms = bufferMinutes * 60 * 1000;
  return { start: new Date(iv.start.getTime() - ms), end: new Date(iv.end.getTime() + ms) };
}

// Re-export for callers that build contexts.
export { cairoWeekday };
