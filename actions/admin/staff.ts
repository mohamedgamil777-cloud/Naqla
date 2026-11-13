"use server";
/** Admin → الموظفين: staff records and roles (passwords live in actions/admin/accounts). */
import { revalidatePath } from "next/cache";
import { createStaff, deleteStaff, listStaff, updateStaff, updateStaffRole } from "@/db/lib/staff";
import { audit, changes } from "@/services/audit";
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
    if (id) {
      const prev = (await listStaff()).find((s) => s.id === id);
      await updateStaff(id, input);
      const diff = changes(prev, input);
      if (Object.keys(diff.after).length)
        await audit({ action: "staff.update", entity: "staff", entityId: id, label: input.name, ...diff });
    } else {
      const created = await createStaff(input);
      await audit({
        action: "staff.create",
        entity: "staff",
        entityId: created.id,
        label: input.name,
        after: { phone: input.phone, role: input.role },
      });
    }
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
    const prev = (await listStaff()).find((s) => s.id === parsed.data.id);
    if ((await updateStaffRole(parsed.data.id, parsed.data.role)) && prev?.role !== parsed.data.role) {
      await audit({
        action: "staff.role",
        entity: "staff",
        entityId: parsed.data.id,
        label: prev?.name ?? null,
        before: { role: prev?.role ?? null },
        after: { role: parsed.data.role },
      });
    }
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
    const prev = (await listStaff()).find((s) => s.id === parsed.data.id);
    const res = await deleteStaff(parsed.data.id);
    if (!res.ok)
      return fail("مينفعش تمسح الموظف ده — عليه رحلات أو طلبات أو تسديدات مسجّلة. غيّر وظيفته بدل المسح.");
    await audit({
      action: "staff.delete",
      entity: "staff",
      entityId: parsed.data.id,
      label: prev?.name ?? null,
      before: prev ? { phone: prev.phone, role: prev.role } : null,
    });
  } catch (error) {
    return actionFailure("deleteStaff", error);
  }
  revalidatePath("/admin/staff");
  return ok();
}
