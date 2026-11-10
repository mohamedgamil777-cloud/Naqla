"use server";
/**
 * شركتي / حسابي — saved addresses (a person's own list, or the shared company list for members)
 * and company users (owner only).
 */
import { revalidatePath } from "next/cache";
import {
  addSavedAddress,
  deleteSavedAddress,
  listSavedAddresses,
  setDefaultSavedAddress,
  updateSavedAddress,
} from "@/db/lib/addresses";
import { addCompanyMember, removeCompanyMember } from "@/db/lib/companies";
import { getSession } from "@/services/session";
import { addressOwner, companyContext } from "@/services/company-service";
import { errorMsgs } from "@/lib/errors";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { formObject, rowRefSchema } from "@/lib/validation/fields";
import {
  companyUserInputSchema,
  savedAddressInputSchema,
  savedAddressRefSchema,
} from "@/lib/validation/company";

const MAX_ADDRESSES = 50;

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
    const owner = await currentAddressOwner();
    if (!owner) return;
    await deleteSavedAddress(parsed.data.id, owner);
  } catch (error) {
    throwActionFailure("deleteSavedAddress", error);
  }
  refreshAddresses();
}

/** The caller's address list: their company's for members, their own otherwise (never from the form). */
async function currentAddressOwner(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  return addressOwner(session.phone, await companyContext(session.phone));
}

function refreshAddresses() {
  revalidatePath("/company");
  revalidatePath("/account");
  revalidatePath("/estimate");
}

/** Add (no id) or edit (id) a saved address; "isDefault" also makes it the default. */
export async function saveSavedAddressAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = savedAddressInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, isDefault, label, address, details, lat, lng } = parsed.data;
  // a pin needs both coordinates
  const point = lat != null && lng != null ? { lat, lng } : { lat: null, lng: null };
  try {
    const owner = await currentAddressOwner();
    if (!owner) return fail(errorMsgs.NotAuthenticated);
    if (id) {
      if (!(await updateSavedAddress(id, owner, { label, address, details, ...point })))
        return fail("العنوان مش موجود.");
      if (isDefault) await setDefaultSavedAddress(id, owner);
    } else {
      if ((await listSavedAddresses(owner)).length >= MAX_ADDRESSES)
        return fail(`أقصى عدد ${MAX_ADDRESSES} عنوان. امسح عنوان قديم الأول.`);
      await addSavedAddress({ owner, label, address, details, ...point, isDefault });
    }
  } catch (error) {
    return actionFailure("saveSavedAddress", error);
  }
  refreshAddresses();
  return ok();
}

export async function setDefaultAddressAction(fd: FormData): Promise<void> {
  const parsed = savedAddressRefSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    const owner = await currentAddressOwner();
    if (!owner) return;
    await setDefaultSavedAddress(parsed.data.id, owner);
  } catch (error) {
    throwActionFailure("setDefaultAddress", error);
  }
  refreshAddresses();
}
