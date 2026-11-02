/** What occupies a vehicle: bookings and admin blocks (maintenance / private). */
import { and, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { vehicleBlocks } from "@/db/schema";
import { BLOCKING_STATUSES } from "@/lib/constants";
import type { BlockDTO, BlockInput, BusyInterval } from "@/types";

/**
 * Busy intervals (blocking bookings + admin blocks) of some vehicles that end after `since` and,
 * when given, start before `until`. Old history is never loaded: availability only looks ahead.
 */
export async function getBusyForVehicles(
  vehicleIds: string[],
  since: Date,
  until?: Date,
  exceptBookingCode?: string,
): Promise<Map<string, BusyInterval[]>> {
  const out = new Map<string, BusyInterval[]>(vehicleIds.map((id) => [id, []]));
  if (!vehicleIds.length) return out;
  const [bks, blks] = await Promise.all([
    db.query.bookings.findMany({
      columns: { vehicleId: true, startsAt: true, endsAt: true },
      where: (bookings) =>
        and(
          inArray(bookings.vehicleId, vehicleIds),
          inArray(bookings.status, BLOCKING_STATUSES),
          gt(bookings.endsAt, since),
          until ? lt(bookings.startsAt, until) : undefined,
          exceptBookingCode ? ne(bookings.code, exceptBookingCode) : undefined,
        ),
    }),
    db.query.vehicleBlocks.findMany({
      columns: { vehicleId: true, startsAt: true, endsAt: true },
      where: (vehicleBlocks) =>
        and(
          inArray(vehicleBlocks.vehicleId, vehicleIds),
          gt(vehicleBlocks.endsAt, since),
          until ? lt(vehicleBlocks.startsAt, until) : undefined,
        ),
    }),
  ]);
  for (const r of [...bks, ...blks]) out.get(r.vehicleId)?.push({ start: r.startsAt, end: r.endsAt });
  return out;
}

/** One vehicle's busy intervals ending after `since` (optionally ignoring one booking being changed). */
export async function getBusy(
  vehicleId: string,
  since: Date,
  exceptBookingCode?: string,
): Promise<BusyInterval[]> {
  return (await getBusyForVehicles([vehicleId], since, undefined, exceptBookingCode)).get(vehicleId) ?? [];
}

/** A vehicle's blocks that haven't ended yet (past blocks are history), soonest first. */
export async function listVehicleBlocks(vehicleId: string, limit = 100): Promise<BlockDTO[]> {
  const rows = await db.query.vehicleBlocks.findMany({
    where: (vehicleBlocks) =>
      and(eq(vehicleBlocks.vehicleId, vehicleId), gt(vehicleBlocks.endsAt, new Date())),
    orderBy: (vehicleBlocks) => vehicleBlocks.startsAt,
    limit: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    vehicleId: r.vehicleId,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    reason: r.reason,
    note: r.note,
  }));
}

export async function createVehicleBlock(input: BlockInput): Promise<{ id: string }> {
  try {
    const [created] = await db
      .insert(vehicleBlocks)
      .values({
        vehicleId: input.vehicleId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        reason: input.reason,
        note: input.note ?? null,
      })
      .returning({ id: vehicleBlocks.id });
    return { id: created.id };
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("BLOCK_OVER_BOOKING")) throw new Error("BLOCK_OVER_BOOKING");
    throw e;
  }
}

/** Every availability block (CSV export). */
export async function listAllVehicleBlocks(): Promise<BlockDTO[]> {
  const rows = await db.query.vehicleBlocks.findMany({ orderBy: (vehicleBlocks) => vehicleBlocks.startsAt });
  return rows.map((r) => ({
    id: r.id,
    vehicleId: r.vehicleId,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    reason: r.reason,
    note: r.note,
  }));
}

export async function deleteVehicleBlock(id: string): Promise<boolean> {
  await db.delete(vehicleBlocks).where(eq(vehicleBlocks.id, id));
  return true;
}
