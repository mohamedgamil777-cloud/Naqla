/** Staff records (every user whose role is not customer). */
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from "@/lib/errors";
import type { StaffDTO, StaffInput, StaffRole } from "@/types";
import { userToStaff } from "./shared";

export async function listStaff(): Promise<StaffDTO[]> {
  const rows = await db.query.users.findMany({
    where: (users) => sql`${users.role} <> 'customer'`,
    orderBy: (users) => users.createdAt,
  });
  return rows.map(userToStaff);
}

export async function createStaff(input: StaffInput): Promise<{ id: string }> {
  const [created] = await db
    .insert(users)
    .values({
      name: input.name,
      phone: input.phone,
      role: input.role,
      nationalId: input.nationalId ?? null,
      photo: input.photo ?? null,
      drivingLicense: input.drivingLicense ?? null,
      vehicleLicense: input.vehicleLicense ?? null,
    })
    .returning({ id: users.id });
  return { id: created.id };
}

export async function updateStaff(id: string, input: StaffInput): Promise<boolean> {
  await db
    .update(users)
    .set({
      name: input.name,
      phone: input.phone,
      role: input.role,
      ...(input.nationalId !== undefined ? { nationalId: input.nationalId } : {}),
      ...(input.photo !== undefined ? { photo: input.photo } : {}),
      ...(input.drivingLicense !== undefined ? { drivingLicense: input.drivingLicense } : {}),
      ...(input.vehicleLicense !== undefined ? { vehicleLicense: input.vehicleLicense } : {}),
    })
    .where(eq(users.id, id));
  return true;
}

export async function updateStaffRole(id: string, role: StaffRole): Promise<boolean> {
  await db.update(users).set({ role }).where(eq(users.id, id));
  return true;
}

/** Staff with trips, orders or payouts can't be deleted (RESTRICT foreign keys keep the history). */
export async function deleteStaff(id: string): Promise<{ ok: boolean; reason?: "IN_USE" }> {
  try {
    await db.delete(users).where(and(eq(users.id, id), ne(users.role, "customer")));
    return { ok: true };
  } catch (e) {
    if (pgErrorCode(e) === PG_FOREIGN_KEY_VIOLATION) return { ok: false, reason: "IN_USE" };
    throw e;
  }
}

/** Resolve a staff member by their login phone (used to identify a driver). */
export async function getStaffByPhone(phone: string): Promise<StaffDTO | null> {
  const u = await db.query.users.findFirst({
    where: (users) => and(eq(users.phone, phone), sql`${users.role} <> 'customer'`),
  });
  return u ? userToStaff(u) : null;
}
