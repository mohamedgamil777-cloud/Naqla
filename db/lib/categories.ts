/** Vehicle types / delivery size classes. */
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { vehicleCategories, vehicles, deliveryOrders } from "@/db/schema";
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from "@/lib/errors";
import type { CategoryDTO, CategoryInput } from "@/types";

export async function listCategories(): Promise<CategoryDTO[]> {
  const rows = await db.query.vehicleCategories.findMany({
    orderBy: (vehicleCategories) => vehicleCategories.sort,
  });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    name: r.name,
    sort: r.sort,
    active: r.active ?? true,
    sizeCode: r.sizeCode ?? null,
    capacityKg: r.capacityKg ?? null,
    dims: r.dims ?? null,
    description: r.description ?? null,
    image: r.image ?? null,
    baseFare: r.baseFare,
    perKm: r.perKm,
  }));
}

export async function createCategory(input: CategoryInput): Promise<{ id: string }> {
  const [created] = await db
    .insert(vehicleCategories)
    .values({
      kind: input.kind,
      name: input.name,
      sort: input.sort ?? 0,
      active: input.active ?? true,
      sizeCode: input.sizeCode ?? null,
      capacityKg: input.capacityKg ?? null,
      dims: input.dims ?? null,
      description: input.description ?? null,
      image: input.image ?? null,
      baseFare: input.baseFare ?? 0,
      perKm: input.perKm ?? 0,
    })
    .returning({ id: vehicleCategories.id });
  return { id: created.id };
}

export async function updateCategory(id: string, input: CategoryInput): Promise<boolean> {
  await db
    .update(vehicleCategories)
    .set({
      kind: input.kind,
      name: input.name,
      ...(input.sort != null ? { sort: input.sort } : {}),
      ...(input.sizeCode !== undefined ? { sizeCode: input.sizeCode } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.capacityKg !== undefined ? { capacityKg: input.capacityKg } : {}),
      ...(input.dims !== undefined ? { dims: input.dims } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.image !== undefined ? { image: input.image } : {}),
      ...(input.baseFare !== undefined ? { baseFare: input.baseFare } : {}),
      ...(input.perKm !== undefined ? { perKm: input.perKm } : {}),
    })
    .where(eq(vehicleCategories.id, id));
  return true;
}

/** Used by fleet vehicles or any delivery order → the foreign keys refuse it; it can only be hidden. */
export async function deleteCategory(id: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    await db.delete(vehicleCategories).where(eq(vehicleCategories.id, id));
    return { ok: true };
  } catch (e) {
    if (pgErrorCode(e) === PG_FOREIGN_KEY_VIOLATION) return { ok: false, reason: "IN_USE" };
    throw e;
  }
}

/** How many vehicles / orders use each vehicle type (used types can be hidden, not deleted). */
export async function categoryUsage(): Promise<Record<string, { vehicles: number; orders: number }>> {
  const [v, o] = await Promise.all([
    db
      .select({ id: vehicles.categoryId, n: sql<number>`count(*)::int` })
      .from(vehicles)
      .groupBy(vehicles.categoryId),
    db
      .select({ id: deliveryOrders.categoryId, n: sql<number>`count(*)::int` })
      .from(deliveryOrders)
      .where(sql`${deliveryOrders.categoryId} IS NOT NULL`)
      .groupBy(deliveryOrders.categoryId),
  ]);
  const usage: Record<string, { vehicles: number; orders: number }> = {};
  for (const r of v) (usage[r.id] ??= { vehicles: 0, orders: 0 }).vehicles = r.n;
  for (const r of o) (usage[r.id!] ??= { vehicles: 0, orders: 0 }).orders = r.n;
  return usage;
}
