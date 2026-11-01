"use server";
/** Admin → الشركات (B2B). Every action re-checks the role: server actions are callable endpoints. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { repo } from "@/data/repo";
import { requireAdminRole } from "@/services/admin-auth";
import { toE164, isValidEgyptianMobile } from "@/lib/phone";
import type { CompanyBilling, CompanyInput, CompanyRole } from "@/data/types";

export interface CompanyFormState {
  ok: boolean;
  error?: string;
}

const ROLES = ["super_admin", "finance"] as const;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const egp = (fd: FormData, k: string) => {
  const n = Number(str(fd, k));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};
const refresh = (id?: string) => {
  revalidatePath("/admin/companies");
  if (id) revalidatePath(`/admin/companies/${id}`);
};

export async function saveCompanyAction(_p: CompanyFormState, fd: FormData): Promise<CompanyFormState> {
  await requireAdminRole([...ROLES]);
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!name) return { ok: false, error: "اكتب اسم الشركة." };
  const discount = Number(str(fd, "discountPct") || 0);
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) return { ok: false, error: "الخصم من 0 لـ 100%." };
  const phoneRaw = str(fd, "phone");
  const input: CompanyInput = {
    name,
    phone: phoneRaw ? (isValidEgyptianMobile(phoneRaw) ? toE164(phoneRaw) : phoneRaw) : null,
    taxNumber: str(fd, "taxNumber") || null,
    address: str(fd, "address") || null,
    discountPct: Math.round(discount),
    billing: (str(fd, "billing") === "monthly" ? "monthly" : "cash") as CompanyBilling,
    creditLimit: egp(fd, "creditLimit"),
    active: id ? fd.get("active") === "on" : true,
  };
  if (id) {
    await repo.updateCompany(id, input);
    refresh(id);
    return { ok: true };
  }
  const { id: newId } = await repo.createCompany(input);
  refresh();
  redirect(`/admin/companies/${newId}`);
}

export async function addMemberAction(_p: CompanyFormState, fd: FormData): Promise<CompanyFormState> {
  await requireAdminRole([...ROLES]);
  const companyId = str(fd, "companyId");
  const phone = str(fd, "phone");
  if (!isValidEgyptianMobile(phone)) return { ok: false, error: "رقم موبايل مش صحيح (01xxxxxxxxx)." };
  const role = (str(fd, "role") === "owner" ? "owner" : "member") as CompanyRole;
  const res = await repo.addCompanyMember(companyId, toE164(phone), str(fd, "name") || null, role);
  if (!res.ok) return { ok: false, error: "الرقم ده مسجّل في شركة تانية." };
  refresh(companyId);
  return { ok: true };
}

export async function removeMemberAction(fd: FormData): Promise<void> {
  await requireAdminRole([...ROLES]);
  const companyId = str(fd, "companyId");
  const member = (await repo.listCompanyMembers(companyId)).find((m) => m.id === str(fd, "id"));
  if (member) await repo.removeCompanyMember(member.id);
  refresh(companyId);
}

export async function addCompanyPaymentAction(_p: CompanyFormState, fd: FormData): Promise<CompanyFormState> {
  await requireAdminRole([...ROLES]);
  const companyId = str(fd, "companyId");
  const amount = egp(fd, "amount");
  if (!amount) return { ok: false, error: "اكتب المبلغ." };
  const m = str(fd, "method");
  await repo.addCompanyPayment({
    companyId,
    amount,
    method: (["cash", "bank", "wallet"].includes(m) ? m : "bank") as "cash" | "bank" | "wallet",
    note: str(fd, "note") || null,
  });
  refresh(companyId);
  return { ok: true };
}

export async function deleteCompanyPaymentAction(fd: FormData): Promise<void> {
  await requireAdminRole([...ROLES]);
  const companyId = str(fd, "companyId");
  const p = (await repo.listCompanyPayments(companyId)).find((x) => x.id === str(fd, "id"));
  if (p) await repo.deleteCompanyPayment(p.id);
  refresh(companyId);
}
