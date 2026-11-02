"use server";
/** Admin → الموظفين: staff records and roles (passwords live in actions/admin/accounts). */
import { revalidatePath } from "next/cache";
import { createStaff, deleteStaff, updateStaff, updateStaffRole } from "@/db/lib/staff";
import { requirePermission } from "@/lib/authz";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "@/lib/errors";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { formObject, rowRefSchema } from "@/lib/validation/fields";
import { staffInputSchema, staffRoleInputSchema } from "@/lib/validation/staff";

export async function saveStaff(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("staff:manage");
  const parsed = staffInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...input } = parsed.data;
  try {
    if (id) await updateStaff(id, input);
    else await createStaff(input);
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) return fail("الرقم ده مضاف قبل كده.");
    return actionFailure("saveStaff", error);
  }
  revalidatePath("/admin/staff");
  return ok();
}

export async function updateStaffRoleAction(fd: FormData): Promise<void> {
  await requirePermission("staff:manage");
  const parsed = staffRoleInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    await updateStaffRole(parsed.data.id, parsed.data.role);
  } catch (error) {
    throwActionFailure("updateStaffRole", error);
  }
  revalidatePath("/admin/staff");
}

/** Staff with trips, orders or payouts are kept (their history pays drivers) — the form explains why. */
export async function deleteStaffAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("staff:manage");
  const parsed = rowRefSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  try {
    const res = await deleteStaff(parsed.data.id);
    if (!res.ok)
      return fail("مينفعش تمسح الموظف ده — عليه رحلات أو طلبات أو تسديدات مسجّلة. غيّر وظيفته بدل المسح.");
  } catch (error) {
    return actionFailure("deleteStaff", error);
  }
  revalidatePath("/admin/staff");
  return ok();
}
