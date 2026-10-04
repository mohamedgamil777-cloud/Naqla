import { describe, it, expect } from "vitest";
import {
  checkRange,
  availableDurations,
  hourSlots,
  nearestAlternatives,
  padInterval,
  type AvailabilityContext,
  type Interval,
} from "@/engines/availability";
import { cairoDateTime, addHours } from "@/lib/time";

// Fixed "now": Fri 2026-09-18 06:00 Cairo, so Sat 2026-09-20 is fully in-window.
const NOW = cairoDateTime("2026-09-18", 6);

function ctx(overrides: Partial<AvailabilityContext> = {}): AvailabilityContext {
  return {
    now: NOW,
    busy: [],
    working: { open: 8, close: 22 },
    vehicleBookable: true,
    minHours: 2,
    maxHours: 24 * 14,
    advanceDays: 30,
    nowLeadHours: 1,
    durationOptions: [2, 4, 6, 8, 12, 24],
    ...overrides,
  };
}

/** Existing booking 10:00–14:00 on Sat 20 Sep, padded by a 30-min buffer. */
function bookedTenToTwo(buffer = 30): Interval {
  const raw: Interval = {
    start: cairoDateTime("2026-09-20", 10),
    end: cairoDateTime("2026-09-20", 14),
  };
  return padInterval(raw, buffer);
}

describe("§52 booking conflict", () => {
  it("rejects an overlapping request 12:00–15:00 against 10:00–14:00", () => {
    const c = ctx({ busy: [bookedTenToTwo()] });
    const r = checkRange(
      cairoDateTime("2026-09-20", 12),
      cairoDateTime("2026-09-20", 15),
      c
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("conflict");
  });

  it("allows a clearly free request 15:00–17:00", () => {
    const c = ctx({ busy: [bookedTenToTwo()] });
    const r = checkRange(
      cairoDateTime("2026-09-20", 15),
      cairoDateTime("2026-09-20", 17),
      c
    );
    expect(r.ok).toBe(true);
  });
});

describe("§52 adjacent booking + buffer", () => {
  it("blocks 14:00–16:00 when a 30-min buffer follows a 10:00–14:00 booking", () => {
    const c = ctx({ busy: [bookedTenToTwo(30)] });
    const r = checkRange(
      cairoDateTime("2026-09-20", 14),
      cairoDateTime("2026-09-20", 16),
      c
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("conflict");
  });

  it("allows 14:00–16:00 when buffer is 0 (adjacent is fine)", () => {
    const c = ctx({ busy: [bookedTenToTwo(0)] });
    const r = checkRange(
      cairoDateTime("2026-09-20", 14),
      cairoDateTime("2026-09-20", 16),
      c
    );
    expect(r.ok).toBe(true);
  });

  it("allows 15:00–17:00 which clears the 30-min buffer", () => {
    const c = ctx({ busy: [bookedTenToTwo(30)] });
    const r = checkRange(
      cairoDateTime("2026-09-20", 15),
      cairoDateTime("2026-09-20", 17),
      c
    );
    expect(r.ok).toBe(true);
  });
});

describe("duration filtering when picking 10:00 near a booking", () => {
  it("offers no long durations when 10:00 is itself booked", () => {
    const c = ctx({ busy: [bookedTenToTwo()] });
    const durations = availableDurations(cairoDateTime("2026-09-20", 10), c);
    expect(durations).toEqual([]);
  });

  it("offers only short durations at 12:00 before a 14:00 booking", () => {
    // Booking 14:00–18:00; at 12:00 only 2h fits (12–14), 4h (12–16) conflicts.
    const raw: Interval = {
      start: cairoDateTime("2026-09-20", 14),
      end: cairoDateTime("2026-09-20", 18),
    };
    const c = ctx({ busy: [padInterval(raw, 0)] });
    const durations = availableDurations(cairoDateTime("2026-09-20", 12), c);
    expect(durations).toContain(2);
    expect(durations).not.toContain(4);
  });
});

describe("§52 maintenance / inactive vehicle", () => {
  it("returns all-unavailable slots and no valid range when not bookable", () => {
    const c = ctx({ vehicleBookable: false });
    const slots = hourSlots("2026-09-20", c, cairoDateTime);
    expect(slots.every((s) => s.status === "unavailable")).toBe(true);
    const r = checkRange(
      cairoDateTime("2026-09-20", 10),
      cairoDateTime("2026-09-20", 12),
      c
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("vehicle_unavailable");
  });
});

describe("working hours & lead time", () => {
  it("rejects a pickup before opening", () => {
    const c = ctx();
    const r = checkRange(
      cairoDateTime("2026-09-20", 6),
      cairoDateTime("2026-09-20", 8),
      c
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("outside_hours");
  });

  it("rejects a return after closing", () => {
    const c = ctx();
    const r = checkRange(
      cairoDateTime("2026-09-20", 21),
      cairoDateTime("2026-09-20", 23),
      c
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("outside_hours");
  });

  it("rejects a start in the past", () => {
    const c = ctx();
    const r = checkRange(
      cairoDateTime("2026-09-17", 10),
      cairoDateTime("2026-09-17", 12),
      c
    );
    expect(r.ok).toBe(false);
    // 2026-09-17 is before NOW (18th) -> in_past.
    expect(r.reason).toBe("in_past");
  });

  it("rejects a booking beyond the advance window", () => {
    const c = ctx();
    const r = checkRange(
      cairoDateTime("2026-11-30", 10),
      cairoDateTime("2026-11-30", 12),
      c
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("too_far");
  });

  it("rejects below-minimum duration", () => {
    const c = ctx();
    const r = checkRange(
      cairoDateTime("2026-09-20", 10),
      cairoDateTime("2026-09-20", 11),
      c
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("below_min");
  });
});

describe("hour grid matches the architecture example", () => {
  it("marks 10:00 and 11:00 booked, others available", () => {
    const raw: Interval = {
      start: cairoDateTime("2026-09-20", 10),
      end: cairoDateTime("2026-09-20", 12),
    };
    const c = ctx({ busy: [padInterval(raw, 0)] });
    const slots = hourSlots("2026-09-20", c, cairoDateTime);
    const byHour = Object.fromEntries(slots.map((s) => [s.hour24, s.status]));
    expect(byHour[9]).toBe("available");
    expect(byHour[10]).toBe("booked");
    expect(byHour[11]).toBe("booked");
    expect(byHour[12]).toBe("available");
  });
});

describe("nearest alternatives", () => {
  it("suggests slots when the desired one is blocked", () => {
    const c = ctx({ busy: [bookedTenToTwo()] });
    const alts = nearestAlternatives("2026-09-20", 2, c, cairoDateTime, 3);
    expect(alts.length).toBeGreaterThan(0);
    // None of the suggested starts should fall inside the booked+buffer window.
    for (const a of alts) {
      const end = addHours(a, 2);
      expect(checkRange(a, end, c).ok).toBe(true);
    }
  });
});
