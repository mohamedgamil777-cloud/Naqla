"use server";
/** شركتي — actions for company members. Members manage saved addresses; only the owner manages users. */
import { revalidatePath } from "next/cache";
import { deleteSavedAddress } from "@/db/lib/addresses";
import { addCompanyMember, removeCompanyMember } from "@/db/lib/companies";
import { getSession } from "@/services/session";
import { addressOwner, companyContext } from "@/services/company-service";
import { errorMsgs } from "@/lib/errors";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { formObject, rowRefSchema } from "@/lib/validation/fields";
import { companyUserInputSchema, savedAddressRefSchema } from "@/lib/validation/company";

/** The caller's company comes from their session phone, never from the form. */
async function currentMember() {
  const session = await getSession();
  if (!session) return null;
  const c = await companyContext(session.phone);
  return c ? { session, ...c } : null;
}

export async function addCompanyUser(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = companyUserInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  try {
    const c = await currentMember();
    if (!c) return fail(errorMsgs.NotAuthenticated);
    if (c.member.role !== "owner") return fail("مدير الحساب بس يقدر يضيف مستخدمين.");
    const res = await addCompanyMember(c.company.id, parsed.data.phone, parsed.data.name, "member");
    if (!res.ok) return fail("الرقم ده مسجّل في حساب شركة تاني.");
  } catch (error) {
    return actionFailure("addCompanyUser", error);
  }
  revalidatePath("/company");
  return ok();
}

export async function removeCompanyUser(fd: FormData): Promise<void> {
  const parsed = rowRefSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    const c = await currentMember();
    if (!c || c.member.role !== "owner") return;
    // scoped to the owner's company; the owner can't remove themselves
    await removeCompanyMember(c.company.id, parsed.data.id, c.member.id);
  } catch (error) {
    throwActionFailure("removeCompanyUser", error);
  }
  revalidatePath("/company");
}

export async function deleteSavedAddressAction(fd: FormData): Promise<void> {
  const parsed = savedAddressRefSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    const session = await getSession();
    if (!session) return;
    const owner = addressOwner(session.phone, await companyContext(session.phone));
    await deleteSavedAddress(parsed.data.id, owner);
  } catch (error) {
    throwActionFailure("deleteSavedAddress", error);
  }
  revalidatePath("/company");
  revalidatePath("/account");
}
