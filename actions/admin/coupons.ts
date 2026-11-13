"use server";
/** Admin → الكوبونات. */
import { revalidatePath } from "next/cache";
import { createCoupon, deleteCoupon, listCoupons, updateCoupon } from "@/db/lib/coupons";
import { audit, changes } from "@/services/audit";
import { requirePermission } from "@/lib/authz";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "@/lib/errors";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { formObject, rowRefSchema } from "@/lib/validation/fields";
import { couponInputSchema } from "@/lib/validation/coupon";

export async function saveCoupon(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("coupon:manage");
  const parsed = couponInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...input } = parsed.data;

  try {
    if (id) {
      const prev = (await listCoupons()).find((c) => c.id === id);
      await updateCoupon(id, input);
      const diff = changes(prev, input);
      if (Object.keys(diff.after).length)
        await audit({ action: "coupon.update", entity: "coupon", entityId: id, label: input.code, ...diff });
    } else {
      const created = await createCoupon(input);
      await audit({
        action: "coupon.create",
        entity: "coupon",
        entityId: created.id,
        label: input.code,
        after: { type: input.type, value: input.value, maxUses: input.maxUses },
      });
    }
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) return fail("الكود ده موجود قبل كده.");
    return actionFailure("saveCoupon", error);
  }
  revalidatePath("/admin/coupons");
  return ok();
}

export async function deleteCouponAction(fd: FormData): Promise<void> {
  await requirePermission("coupon:manage");
  const parsed = rowRefSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    const prev = (await listCoupons()).find((c) => c.id === parsed.data.id);
    if (await deleteCoupon(parsed.data.id))
      await audit({ action: "coupon.delete", entity: "coupon", entityId: parsed.data.id, label: prev?.code ?? null });
  } catch (error) {
    throwActionFailure("deleteCoupon", error);
  }
  revalidatePath("/admin/coupons");
}
