/** Drivers: earnings, ratings, payouts and availability. */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { users, deliveryOrders, driverPayouts } from "@/db/schema";
import type { DriverPayoutDTO, DriverPayoutInput, StaffDTO } from "@/types";
import { userToStaff } from "./shared";

/** Driver fees earned on completed orders, per driver (piastres). */
export async function driverEarnings(): Promise<Map<string, number>> {
  const rows = await db
    .select({
      driverId: deliveryOrders.driverId,
      earned: sql<number>`coalesce(sum(${deliveryOrders.driverFee}), 0)::int`,
    })
    .from(deliveryOrders)
    .where(and(eq(deliveryOrders.status, "completed"), sql`${deliveryOrders.driverId} IS NOT NULL`))
    .groupBy(deliveryOrders.driverId);
  return new Map(rows.map((r) => [r.driverId!, r.earned]));
}

/** Customers' star ratings per driver. */
export async function driverRatingStats(): Promise<Record<string, { avg: number; count: number }>> {
  const rows = await db
    .select({
      driverId: deliveryOrders.driverId,
      avg: sql<number>`avg(${deliveryOrders.rating})::float`,
      count: sql<number>`count(${deliveryOrders.rating})::int`,
    })
    .from(deliveryOrders)
    .where(and(sql`${deliveryOrders.driverId} IS NOT NULL`, sql`${deliveryOrders.rating} IS NOT NULL`))
    .groupBy(deliveryOrders.driverId);
  return Object.fromEntries(rows.map((r) => [r.driverId!, { avg: r.avg, count: r.count }]));
}

/** Most recent payouts first. */
export async function listDriverPayouts(limit = 200): Promise<DriverPayoutDTO[]> {
  const rows = await db.query.driverPayouts.findMany({
    with: { driver: { columns: { name: true } } },
    orderBy: (driverPayouts) => desc(driverPayouts.createdAt),
    limit,
  });
  return rows.map(({ driver, ...p }) => ({ ...p, driverName: driver?.name ?? null }));
}

/** Total paid to each driver (piastres). */
export async function driverPayoutTotals(): Promise<Map<string, number>> {
  const rows = await db
    .select({
      driverId: driverPayouts.driverId,
      paid: sql<number>`coalesce(sum(${driverPayouts.amount}), 0)::int`,
    })
    .from(driverPayouts)
    .groupBy(driverPayouts.driverId);
  return new Map(rows.map((r) => [r.driverId, r.paid]));
}

export async function addDriverPayout(input: DriverPayoutInput): Promise<{ id: string }> {
  const [created] = await db
    .insert(driverPayouts)
    .values({
      driverId: input.driverId,
      amount: Math.max(0, Math.round(input.amount)),
      method: input.method,
      note: input.note ?? null,
    })
    .returning({ id: driverPayouts.id });
  return { id: created.id };
}

export async function deleteDriverPayout(id: string): Promise<boolean> {
  await db.delete(driverPayouts).where(eq(driverPayouts.id, id));
  return true;
}

export async function listDrivers(): Promise<StaffDTO[]> {
  const rows = await db.query.users.findMany({
    where: (users) => eq(users.role, "driver"),
    orderBy: (users) => users.createdAt,
  });
  return rows.map(userToStaff);
}

/** Driver's own "متاح للعمل" toggle. */
export async function setStaffAvailable(id: string, available: boolean): Promise<boolean> {
  await db.update(users).set({ available }).where(eq(users.id, id));
  return true;
}

/** One driver's totals: completed orders, fees earned, active orders and customers' rating. */
export async function driverStats(driverId: string): Promise<{
  completed: number;
  earned: number;
  active: number;
  rating: { avg: number; count: number } | null;
}> {
  const [row] = await db
    .select({
      completed: sql<number>`count(*) filter (where ${deliveryOrders.status} = 'completed')::int`,
      earned: sql<number>`coalesce(sum(${deliveryOrders.driverFee}) filter (where ${deliveryOrders.status} = 'completed'), 0)::int`,
      active: sql<number>`count(*) filter (where ${deliveryOrders.status} in ('assigned', 'en_route', 'arrived'))::int`,
      ratingAvg: sql<number | null>`avg(${deliveryOrders.rating})::float`,
      ratingCount: sql<number>`count(${deliveryOrders.rating})::int`,
    })
    .from(deliveryOrders)
    .where(eq(deliveryOrders.driverId, driverId));
  return {
    completed: row.completed,
    earned: row.earned,
    active: row.active,
    rating: row.ratingCount ? { avg: row.ratingAvg ?? 0, count: row.ratingCount } : null,
  };
}
