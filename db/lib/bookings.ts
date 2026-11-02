/** Rental bookings: creation, lookups, admin lists and the lifecycle. */
import { and, asc, desc, eq, gt, gte, ilike, inArray, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { vehicles, bookings } from "@/db/schema";
import type { Quote } from "@/engines/pricing";
import { BLOCKING_STATUSES, newBookingCode } from "@/lib/constants";
import type { BookingDTO, CreateBookingInput, Page } from "@/types";
import { bookingWith, countAll, likeTerm, mapBooking, mapBookingError, toPage } from "./shared";
import { redeemPromo } from "./coupons";

export async function updateBookingSchedule(code: string, endsAt: Date, quote: Quote): Promise<boolean> {
  try {
    await db.update(bookings).set({ endsAt, priceSnapshot: quote }).where(eq(bookings.code, code));
    return true;
  } catch (e) {
    mapBookingError(e);
  }
}

/** Inserts the booking and counts the coupon use in one transaction (both or neither). */
export async function insertBooking(
  input: CreateBookingInput,
  quote: Quote,
  branchId: string,
  redeemPromoCode: string | null,
): Promise<{ code: string }> {
  const code = newBookingCode();
  try {
    await db.transaction(async (tx) => {
      await tx.insert(bookings).values({
        code,
        vehicleId: input.vehicleId,
        branchId,
        customerId: input.customerId ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        // agent bookings are confirmed on creation (the agent reserved them directly)
        status: input.source === "agent" ? "confirmed" : "pending",
        withDriver: input.withDriver,
        delivery: input.delivery,
        loaders: input.loaders ?? 0,
        source: input.source ?? "customer",
        agentName: input.agentName ?? null,
        deliveryAddress: input.deliveryAddress ?? null,
        priceSnapshot: quote,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
      });
      if (redeemPromoCode) await redeemPromo(tx, redeemPromoCode);
    });
    return { code };
  } catch (e) {
    mapBookingError(e);
  }
}

export async function getBooking(code: string): Promise<BookingDTO | null> {
  const booking = await db.query.bookings.findFirst({
    where: (bookings) => eq(bookings.code, code),
    with: {
      vehicle: { columns: { id: true, name: true }, with: { images: { columns: { url: true }, limit: 1 } } },
      branch: { columns: { name: true } },
      driver: { columns: { name: true } },
    },
  });
  if (!booking) return null;
  return mapBooking(booking, { primaryImage: booking.vehicle.images[0]?.url ?? null });
}

/** Every booking — only for the full-data CSV export (reporting); screens use the paged/ranged reads. */
export async function listAllBookings(): Promise<BookingDTO[]> {
  const rows = await db.query.bookings.findMany({
    with: bookingWith,
    orderBy: (bookings) => bookings.startsAt,
  });
  return rows.map((r) => mapBooking(r));
}

/**
 * Booking lists (admin, a customer's own): by pickup time, filtered (pickup in [start, end)) and
 * paginated in the database. `latestFirst` puts the most recent pickup first.
 */
export async function searchBookings(
  filter: { status?: BookingDTO["status"]; q?: string; start?: Date; end?: Date; phone?: string },
  page: number,
  pageSize: number,
  latestFirst = false,
): Promise<Page<BookingDTO>> {
  const bookingWhere = (b: typeof bookings._.columns) => {
    const conds: SQL[] = [];
    if (filter.phone) conds.push(eq(b.contactPhone, filter.phone));
    if (filter.status) conds.push(eq(b.status, filter.status));
    if (filter.start) conds.push(gte(b.startsAt, filter.start));
    if (filter.end) conds.push(lt(b.startsAt, filter.end));
    const term = filter.q?.trim();
    if (term) {
      const like = likeTerm(term);
      conds.push(
        or(
          ilike(b.code, like),
          ilike(b.contactName, like),
          ilike(b.contactPhone, like),
          inArray(
            b.vehicleId,
            db.select({ id: vehicles.id }).from(vehicles).where(ilike(vehicles.name, like)),
          ),
        )!,
      );
    }
    return conds.length ? and(...conds) : undefined;
  };
  const [{ count }] = await db.select({ count: countAll }).from(bookings).where(bookingWhere(bookings));
  const rows = await db.query.bookings.findMany({
    where: (bookings) => bookingWhere(bookings),
    with: bookingWith,
    orderBy: (bookings) => [latestFirst ? desc(bookings.startsAt) : asc(bookings.startsAt), asc(bookings.id)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return toPage(
    rows.map((r) => mapBooking(r)),
    count,
    page,
    pageSize,
  );
}

/** Bookings whose pickup is in [start, end). */
export async function listBookingsStartingBetween(start: Date, end: Date): Promise<BookingDTO[]> {
  const rows = await db.query.bookings.findMany({
    where: (bookings) => and(gte(bookings.startsAt, start), lt(bookings.startsAt, end)),
    with: bookingWith,
    orderBy: (bookings) => bookings.startsAt,
  });
  return rows.map((r) => mapBooking(r));
}

/** Rentals running right now (dashboard). */
export async function countActiveBookings(now: Date): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      and(inArray(bookings.status, BLOCKING_STATUSES), lte(bookings.startsAt, now), gt(bookings.endsAt, now)),
    );
  return row.n;
}

/** The next bookings still to start (dashboard). */
export async function listUpcomingBookings(now: Date, limit: number): Promise<BookingDTO[]> {
  const rows = await db.query.bookings.findMany({
    where: (bookings) =>
      and(inArray(bookings.status, ["pending", "confirmed", "ready"]), gt(bookings.startsAt, now)),
    with: bookingWith,
    orderBy: (bookings) => bookings.startsAt,
    limit,
  });
  return rows.map((r) => mapBooking(r));
}

export async function countBookingsByStatus(): Promise<Partial<Record<BookingDTO["status"], number>>> {
  const rows = await db
    .select({ status: bookings.status, n: sql<number>`count(*)::int` })
    .from(bookings)
    .groupBy(bookings.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

export async function cancelBooking(code: string, phone: string): Promise<boolean> {
  const res = await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(bookings.code, code),
        eq(bookings.contactPhone, phone),
        inArray(bookings.status, ["pending", "confirmed", "ready"]),
      ),
    )
    .returning({ id: bookings.id });
  return res.length > 0;
}

export async function adminUpdateBookingStatus(code: string, status: BookingDTO["status"]): Promise<boolean> {
  const res = await db
    .update(bookings)
    .set({ status })
    .where(eq(bookings.code, code))
    .returning({ id: bookings.id });
  return res.length > 0;
}

/** A driver moves their own trip (one conditional update: still theirs and still in `from`). */
export async function advanceBookingByDriver(
  code: string,
  driverId: string,
  from: BookingDTO["status"][],
  to: BookingDTO["status"],
): Promise<boolean> {
  const res = await db
    .update(bookings)
    .set({ status: to })
    .where(and(eq(bookings.code, code), eq(bookings.driverId, driverId), inArray(bookings.status, from)))
    .returning({ id: bookings.id });
  return res.length > 0;
}

export async function adminAssignDriver(code: string, driverId: string | null): Promise<boolean> {
  const res = await db
    .update(bookings)
    .set({ driverId })
    .where(eq(bookings.code, code))
    .returning({ id: bookings.id });
  return res.length > 0;
}
