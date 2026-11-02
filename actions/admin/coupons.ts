"use server";
/** Admin → الكوبونات. */
import { revalidatePath } from "next/cache";
import { createCoupon, deleteCoupon, updateCoupon } from "@/db/lib/coupons";
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
    if (id) await updateCoupon(id, input);
    else await createCoupon(input);
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
    await deleteCoupon(parsed.data.id);
  } catch (error) {
    throwActionFailure("deleteCoupon", error);
  }
  revalidatePath("/admin/coupons");
}
