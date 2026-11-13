"use server";
/** Admin → تسديدات السواقين and النثريات. */
import { revalidatePath } from "next/cache";
import { addDriverPayout, deleteDriverPayout, listDriverPayouts, listDrivers } from "@/db/lib/drivers";
import { addExpense, deleteExpense, listExpenses } from "@/db/lib/expenses";
import { audit } from "@/services/audit";
import { requirePermission } from "@/lib/authz";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { formObject, rowRefSchema } from "@/lib/validation/fields";
import { driverPayoutInputSchema, expenseInputSchema } from "@/lib/validation/finance";

export async function addDriverPayoutAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("payout:manage");
  const parsed = driverPayoutInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  try {
    const driver = (await listDrivers()).find((d) => d.id === parsed.data.driverId);
    if (!driver) return fail("اختار السائق.");
    const created = await addDriverPayout(parsed.data);
    await audit({
      action: "payout.add",
      entity: "payout",
      entityId: created.id,
      label: driver.name,
      after: { amount: parsed.data.amount, method: parsed.data.method, note: parsed.data.note },
    });
  } catch (error) {
    return actionFailure("addDriverPayout", error);
  }
  revalidatePath("/admin/settlements");
  revalidatePath("/admin");
  return ok();
}

export async function deletePayoutAction(fd: FormData): Promise<void> {
  await requirePermission("payout:manage");
  const parsed = rowRefSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    const prev = (await listDriverPayouts()).find((p) => p.id === parsed.data.id);
    if (await deleteDriverPayout(parsed.data.id)) {
      await audit({
        action: "payout.delete",
        entity: "payout",
        entityId: parsed.data.id,
        label: prev?.driverName ?? null,
        before: prev ? { amount: prev.amount, method: prev.method, note: prev.note } : null,
      });
    }
  } catch (error) {
    throwActionFailure("deletePayout", error);
  }
  revalidatePath("/admin/settlements");
  revalidatePath("/admin");
}

export async function addExpenseAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("expense:manage");
  const parsed = expenseInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  try {
    const created = await addExpense(parsed.data);
    await audit({
      action: "expense.add",
      entity: "expense",
      entityId: created.id,
      label: parsed.data.category,
      after: { amount: parsed.data.amount, note: parsed.data.note },
    });
  } catch (error) {
    return actionFailure("addExpense", error);
  }
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
  return ok();
}

export async function deleteExpenseAction(fd: FormData): Promise<void> {
  await requirePermission("expense:manage");
  const parsed = rowRefSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    const prev = (await listExpenses()).find((e) => e.id === parsed.data.id);
    if (await deleteExpense(parsed.data.id)) {
      await audit({
        action: "expense.delete",
        entity: "expense",
        entityId: parsed.data.id,
        label: prev?.category ?? null,
        before: prev ? { amount: prev.amount, note: prev.note } : null,
      });
    }
  } catch (error) {
    throwActionFailure("deleteExpense", error);
  }
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
}
