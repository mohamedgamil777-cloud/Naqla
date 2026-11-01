"use server";
/** شركتي — actions for company members. Members can manage saved addresses; only the owner manages users. */
import { revalidatePath } from "next/cache";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { addressOwner, companyContext } from "@/services/company-service";
import { isValidEgyptianMobile, toE164 } from "@/lib/phone";

export interface CompanyActionState {
  ok: boolean;
  error?: string;
}

async function ctx() {
  const session = await getSession();
  if (!session) return null;
  const c = await companyContext(session.phone);
  return c ? { session, ...c } : null;
}

export async function addCompanyUser(_p: CompanyActionState, fd: FormData): Promise<CompanyActionState> {
  const c = await ctx();
  if (!c) return { ok: false, error: "سجّل دخولك الأول." };
  if (c.member.role !== "owner") return { ok: false, error: "مدير الحساب بس يقدر يضيف مستخدمين." };
  const phone = String(fd.get("phone") ?? "").trim();
  if (!isValidEgyptianMobile(phone)) return { ok: false, error: "رقم موبايل مش صحيح (01xxxxxxxxx)." };
  const name = String(fd.get("name") ?? "").trim() || null;
  const res = await repo.addCompanyMember(c.company.id, toE164(phone), name, "member");
  if (!res.ok) return { ok: false, error: "الرقم ده مسجّل في حساب شركة تاني." };
  revalidatePath("/company");
  return { ok: true };
}

export async function removeCompanyUser(fd: FormData): Promise<void> {
  const c = await ctx();
  if (!c || c.member.role !== "owner") return;
  const id = String(fd.get("id") ?? "");
  const target = (await repo.listCompanyMembers(c.company.id)).find((m) => m.id === id);
  if (target && target.id !== c.member.id) await repo.removeCompanyMember(target.id); // can't remove yourself
  revalidatePath("/company");
}

export async function deleteSavedAddressAction(fd: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const owner = addressOwner(session.phone, await companyContext(session.phone));
  await repo.deleteSavedAddress(String(fd.get("id") ?? ""), owner);
  revalidatePath("/company");
  revalidatePath("/account");
}
