"use server";
/**
 * Account actions in admin: passwords for staff/drivers, and agent verification + password reset for
 * customers. Each action checks its permission AND the target account's type on the server, so a
 * customer-manager can never change a staff password through these.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { repo } from "@/db/repo";
import { requirePermission } from "@/lib/authz";
import { adminSetPassword } from "@/services/auth";

export interface AccountActionState {
  ok: boolean;
  error?: string;
}

const PasswordInput = z.object({ id: z.string().uuid(), password: z.string().min(1).max(128) });
const IdInput = z.object({ id: z.string().uuid() });

/** staff:manage — set or reset the password of a staff member or driver. */
export async function setStaffPasswordAction(_p: AccountActionState, fd: FormData): Promise<AccountActionState> {
  await requirePermission("staff:manage");
  const parsed = PasswordInput.safeParse({ id: fd.get("id"), password: fd.get("password") });
  if (!parsed.success) return { ok: false, error: "اكتب كلمة السر الجديدة." };
  const acct = await repo.getAccountById(parsed.data.id);
  if (!acct || acct.role === "customer") return { ok: false, error: "الموظف مش موجود." };
  const r = await adminSetPassword(acct.id, acct.role, parsed.data.password);
  if (!r.ok) return r;
  revalidatePath("/admin/staff");
  return { ok: true };
}

/** customer:manage — give a customer a temporary password (they forgot theirs; no OTP for now). */
export async function setCustomerPasswordAction(_p: AccountActionState, fd: FormData): Promise<AccountActionState> {
  await requirePermission("customer:manage");
  const parsed = PasswordInput.safeParse({ id: fd.get("id"), password: fd.get("password") });
  if (!parsed.success) return { ok: false, error: "اكتب كلمة السر الجديدة." };
  const acct = await repo.getAccountById(parsed.data.id);
  if (!acct || acct.role !== "customer") return { ok: false, error: "العميل مش موجود." };
  const r = await adminSetPassword(acct.id, acct.role, parsed.data.password);
  if (!r.ok) return r;
  revalidatePath("/admin/customers");
  return { ok: true };
}

/** customer:manage — an agent called the number and confirmed it belongs to this customer. */
export async function verifyCustomerPhoneAction(fd: FormData): Promise<void> {
  await requirePermission("customer:manage");
  const parsed = IdInput.safeParse({ id: fd.get("id") });
  if (!parsed.success) return;
  const acct = await repo.getAccountById(parsed.data.id);
  if (!acct || acct.role !== "customer") return;
  await repo.setPhoneVerified(acct.id, fd.get("verified") !== "0");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/orders");
}
