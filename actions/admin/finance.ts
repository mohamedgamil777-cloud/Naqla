"use server";
/** Admin → تسديدات السواقين and النثريات. */
import { revalidatePath } from "next/cache";
import { addDriverPayout, deleteDriverPayout, listDrivers } from "@/db/lib/drivers";
import { addExpense, deleteExpense } from "@/db/lib/expenses";
import { requirePermission } from "@/lib/authz";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { formObject, rowRefSchema } from "@/lib/validation/fields";
import { driverPayoutInputSchema, expenseInputSchema } from "@/lib/validation/finance";

export async function addDriverPayoutAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("payout:manage");
  const parsed = driverPayoutInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  try {
    const drivers = await listDrivers();
    if (!drivers.some((d) => d.id === parsed.data.driverId)) return fail("اختار السائق.");
    await addDriverPayout(parsed.data);
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
    await deleteDriverPayout(parsed.data.id);
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
    await addExpense(parsed.data);
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
    await deleteExpense(parsed.data.id);
  } catch (error) {
    throwActionFailure("deleteExpense", error);
  }
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
}
