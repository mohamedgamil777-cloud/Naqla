"use server";
/** Admin → الشركات (B2B). Every action re-checks the permission: server actions are callable endpoints. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addCompanyMember,
  addCompanyPayment,
  createCompany,
  deleteCompanyPayment,
  getCompany,
  removeCompanyMember,
  updateCompany,
} from "@/db/lib/companies";
import { requirePermission } from "@/lib/authz";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { formObject } from "@/lib/validation/fields";
import {
  companyChildRefSchema,
  companyInputSchema,
  companyMemberInputSchema,
  companyPaymentInputSchema,
} from "@/lib/validation/company";

function refresh(companyId?: string) {
  revalidatePath("/admin/companies");
  if (companyId) revalidatePath(`/admin/companies/${companyId}`);
}

export async function saveCompanyAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("company:manage");
  const parsed = companyInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...input } = parsed.data;

  let newId: string;
  try {
    if (id) {
      await updateCompany(id, input);
      refresh(id);
      return ok();
    }
    // a new company starts active
    newId = (await createCompany({ ...input, active: true })).id;
  } catch (error) {
    return actionFailure("saveCompany", error);
  }
  refresh();
  redirect(`/admin/companies/${newId}`);
}

export async function addMemberAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("company:manage");
  const parsed = companyMemberInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { companyId, phone, name, role } = parsed.data;
  try {
    if (!(await getCompany(companyId))) return fail("الشركة مش موجودة.");
    const res = await addCompanyMember(companyId, phone, name, role);
    if (!res.ok) return fail("الرقم ده مسجّل في شركة تانية.");
  } catch (error) {
    return actionFailure("addCompanyMember", error);
  }
  refresh(companyId);
  return ok();
}

export async function removeMemberAction(fd: FormData): Promise<void> {
  await requirePermission("company:manage");
  const parsed = companyChildRefSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    await removeCompanyMember(parsed.data.companyId, parsed.data.id);
  } catch (error) {
    throwActionFailure("removeCompanyMember", error);
  }
  refresh(parsed.data.companyId);
}

export async function addCompanyPaymentAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("company:manage");
  const parsed = companyPaymentInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  try {
    if (!(await getCompany(parsed.data.companyId))) return fail("الشركة مش موجودة.");
    await addCompanyPayment(parsed.data);
  } catch (error) {
    return actionFailure("addCompanyPayment", error);
  }
  refresh(parsed.data.companyId);
  return ok();
}

export async function deleteCompanyPaymentAction(fd: FormData): Promise<void> {
  await requirePermission("company:manage");
  const parsed = companyChildRefSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    await deleteCompanyPayment(parsed.data.companyId, parsed.data.id);
  } catch (error) {
    throwActionFailure("deleteCompanyPayment", error);
  }
  refresh(parsed.data.companyId);
}
