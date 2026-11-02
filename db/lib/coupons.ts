/** Promo codes: validation, admin CRUD and redemption. */
import { and, desc, eq, sql } from "drizzle-orm";
import { db, type Executor } from "@/db/client";
import { promoCodes } from "@/db/schema";
import type { PromoInput } from "@/engines/pricing";
import type { CouponDTO, CouponInput } from "@/types";

export async function validatePromo(code: string, subtotal: number): Promise<PromoInput | null> {
  const p = await db.query.promoCodes.findFirst({
    where: (promoCodes) => and(eq(promoCodes.code, code.trim()), eq(promoCodes.active, true)),
  });
  if (!p) return null;
  const now = new Date();
  if (p.validFrom && now < p.validFrom) return null;
  if (p.validTo && now > p.validTo) return null;
  if (p.maxUses != null && p.used >= p.maxUses) return null;
  if (subtotal < p.minValue) return null;
  return { code: p.code, type: p.type, value: p.value };
}

export async function listCoupons(): Promise<CouponDTO[]> {
  const rows = await db.query.promoCodes.findMany({ orderBy: (promoCodes) => desc(promoCodes.createdAt) });
  return rows.map((p) => ({
    id: p.id,
    code: p.code,
    type: p.type,
    value: p.value,
    minValue: p.minValue,
    validTo: p.validTo ? p.validTo.toISOString().slice(0, 10) : null,
    maxUses: p.maxUses ?? null,
    used: p.used,
    active: p.active,
  }));
}

export async function createCoupon(input: CouponInput): Promise<{ id: string }> {
  const [created] = await db
    .insert(promoCodes)
    .values({
      code: input.code.trim(),
      type: input.type,
      value: input.value,
      minValue: input.minValue,
      validTo: input.validTo ? new Date(input.validTo + "T23:59:59") : null,
      maxUses: input.maxUses ?? null,
      active: input.active,
    })
    .returning({ id: promoCodes.id });
  return { id: created.id };
}

export async function updateCoupon(id: string, input: CouponInput): Promise<boolean> {
  await db
    .update(promoCodes)
    .set({
      code: input.code.trim(),
      type: input.type,
      value: input.value,
      minValue: input.minValue,
      validTo: input.validTo ? new Date(input.validTo + "T23:59:59") : null,
      maxUses: input.maxUses ?? null,
      active: input.active,
    })
    .where(eq(promoCodes.id, id));
  return true;
}

export async function deleteCoupon(id: string): Promise<boolean> {
  await db.delete(promoCodes).where(eq(promoCodes.id, id));
  return true;
}

/** Count one use of a coupon, inside the transaction that created the booking/order. */
export async function redeemPromo(tx: Executor, code: string): Promise<void> {
  await tx
    .update(promoCodes)
    .set({ used: sql`${promoCodes.used} + 1` })
    .where(eq(promoCodes.code, code.trim()));
}
