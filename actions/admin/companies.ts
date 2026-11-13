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
  listCompanyMembers,
  listCompanyPayments,
  removeCompanyMember,
  updateCompany,
} from "@/db/lib/companies";
import { setCompanyRequestStatus } from "@/db/lib/company-requests";
import { setCompanyUserLogin } from "@/services/company-users";
import { requirePermission } from "@/lib/authz";
import { audit, changes } from "@/services/audit";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { formObject, rowRefSchema } from "@/lib/validation/fields";
import {
  companyChildRefSchema,
  companyInputSchema,
  companyMemberInputSchema,
  companyPaymentInputSchema,
  companyUserLoginSchema,
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
      const prev = await getCompany(id);
      await updateCompany(id, input);
      const diff = changes(prev, input);
      if (Object.keys(diff.after).length)
        await audit({ action: "company.update", entity: "company", entityId: id, label: input.name, ...diff });
      refresh(id);
      return ok();
    }
    // a new company starts active
    newId = (await createCompany({ ...input, active: true })).id;
    await audit({ action: "company.create", entity: "company", entityId: newId, label: input.name, after: { phone: input.phone } });
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
  const { companyId, phone, name, role, username, password } = parsed.data;
  try {
    if (!(await getCompany(companyId))) return fail("الشركة مش موجودة.");
    const res = await addCompanyMember(companyId, phone, name, role);
    if (!res.ok) return fail("الرقم ده مسجّل في شركة تانية.");
    if (username) {
      const problem = await setCompanyUserLogin({ phone, name, username, password, mayReplacePassword: true });
      if (problem) {
        await removeCompanyMember(companyId, (await memberIdByPhone(companyId, phone)) ?? "");
        return fail(problem);
      }
    }
    await audit({
      action: "company.member_add",
      entity: "company",
      entityId: companyId,
      label: (await getCompany(companyId))?.name ?? null,
      after: { name, phone, role, username },
    });
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
    const m = (await listCompanyMembers(parsed.data.companyId)).find((x) => x.id === parsed.data.id);
    if (await removeCompanyMember(parsed.data.companyId, parsed.data.id)) {
      await audit({
        action: "company.member_remove",
        entity: "company",
        entityId: parsed.data.companyId,
        label: (await getCompany(parsed.data.companyId))?.name ?? null,
        before: m ? { name: m.name, phone: m.phone, role: m.role } : null,
      });
    }
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
    const company = await getCompany(parsed.data.companyId);
    if (!company) return fail("الشركة مش موجودة.");
    await addCompanyPayment(parsed.data);
    await audit({
      action: "company.payment_add",
      entity: "company",
      entityId: company.id,
      label: company.name,
      after: { amount: parsed.data.amount, method: parsed.data.method, note: parsed.data.note },
    });
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
    const prev = (await listCompanyPayments(parsed.data.companyId, 500)).find((p) => p.id === parsed.data.id);
    if (await deleteCompanyPayment(parsed.data.companyId, parsed.data.id)) {
      await audit({
        action: "company.payment_delete",
        entity: "company",
        entityId: parsed.data.companyId,
        label: (await getCompany(parsed.data.companyId))?.name ?? null,
        before: prev ? { amount: prev.amount, method: prev.method, note: prev.note } : null,
      });
    }
  } catch (error) {
    throwActionFailure("deleteCompanyPayment", error);
  }
  refresh(parsed.data.companyId);
}

/** «للشركات» request: mark it handled once staff have called back (or reopen it). */
export async function setCompanyRequestStatusAction(fd: FormData): Promise<void> {
  await requirePermission("company:manage");
  const parsed = rowRefSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  const status = fd.get("status") === "new" ? "new" : "handled";
  try {
    if (await setCompanyRequestStatus(parsed.data.id, status)) {
      await audit({
        action: "company.request",
        entity: "company_request",
        entityId: parsed.data.id,
        after: { status: status === "handled" ? "اتعامل معاه" : "جديد" },
      });
    }
  } catch (error) {
    throwActionFailure("setCompanyRequestStatus", error);
  }
  refresh();
}

async function memberIdByPhone(companyId: string, phone: string): Promise<string | null> {
  return (await listCompanyMembers(companyId)).find((m) => m.phone === phone)?.id ?? null;
}

/** Staff set a company user's username (and a new password when typed). */
export async function setMemberLoginAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("company:manage");
  const parsed = companyUserLoginSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { companyId, id, username, password } = parsed.data;
  if (!companyId || !id) return fail("المستخدم مش موجود.");
  try {
    const m = (await listCompanyMembers(companyId)).find((x) => x.id === id);
    if (!m) return fail("المستخدم مش موجود.");
    const problem = await setCompanyUserLogin({ phone: m.phone, name: m.name, username, password, mayReplacePassword: true });
    if (problem) return fail(problem);
    await audit({
      action: "company.member_login",
      entity: "company",
      entityId: companyId,
      label: m.name || m.phone,
      after: { username, password: password ? "(اتغيّرت)" : null },
    });
  } catch (error) {
    return actionFailure("setMemberLogin", error);
  }
  refresh(companyId);
  return ok();
}
