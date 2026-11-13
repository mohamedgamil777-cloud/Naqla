"use server";
/**
 * Account actions in admin: passwords for staff/drivers, and agent verification + password reset for
 * customers. Each action checks its permission AND the target account's type on the server, so a
 * customer-manager can never change a staff password through these.
 */
import { revalidatePath } from "next/cache";
import { getAccountById, setPhoneVerified } from "@/db/lib/accounts";
import { requirePermission } from "@/lib/authz";
import { adminSetPassword } from "@/services/auth";
import { audit } from "@/services/audit";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { accountPasswordInputSchema, accountRefSchema } from "@/lib/validation/staff";

/** staff:manage — set or reset the password of a staff member or driver. */
export async function setStaffPasswordAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("staff:manage");
  const parsed = accountPasswordInputSchema.safeParse({ id: fd.get("id"), password: fd.get("password") });
  if (!parsed.success) return invalid(parsed.error);
  try {
    const acct = await getAccountById(parsed.data.id);
    if (!acct || acct.role === "customer") return fail("الموظف مش موجود.");
    const r = await adminSetPassword(acct.id, acct.role, parsed.data.password);
    if (!r.ok) return fail(r.error);
    await audit({ action: "staff.password", entity: "staff", entityId: acct.id, label: acct.name || acct.phone });
  } catch (error) {
    return actionFailure("setStaffPassword", error);
  }
  revalidatePath("/admin/staff");
  return ok();
}

/** customer:manage — give a customer a temporary password (they forgot theirs; no OTP for now). */
export async function setCustomerPasswordAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("customer:manage");
  const parsed = accountPasswordInputSchema.safeParse({ id: fd.get("id"), password: fd.get("password") });
  if (!parsed.success) return invalid(parsed.error);
  try {
    const acct = await getAccountById(parsed.data.id);
    if (!acct || acct.role !== "customer") return fail("العميل مش موجود.");
    const r = await adminSetPassword(acct.id, acct.role, parsed.data.password);
    if (!r.ok) return fail(r.error);
    await audit({
      action: "customer.password",
      entity: "customer",
      entityId: acct.id,
      label: acct.name ? `${acct.name} (${acct.phone})` : acct.phone,
    });
  } catch (error) {
    return actionFailure("setCustomerPassword", error);
  }
  revalidatePath("/admin/customers");
  return ok();
}

/** customer:manage — an agent called the number and confirmed it belongs to this customer. */
export async function verifyCustomerPhoneAction(fd: FormData): Promise<void> {
  await requirePermission("customer:manage");
  const parsed = accountRefSchema.safeParse({ id: fd.get("id") });
  if (!parsed.success) return;
  try {
    const acct = await getAccountById(parsed.data.id);
    if (!acct || acct.role !== "customer") return;
    const verified = fd.get("verified") !== "0";
    if (await setPhoneVerified(acct.id, verified)) {
      await audit({
        action: "customer.verify",
        entity: "customer",
        entityId: acct.id,
        label: acct.name ? `${acct.name} (${acct.phone})` : acct.phone,
        before: { verified: !!acct.phoneVerifiedAt },
        after: { verified },
      });
    }
  } catch (error) {
    throwActionFailure("verifyCustomerPhone", error);
  }
  revalidatePath("/admin/customers");
  revalidatePath("/admin/orders");
}
