"use server";
/** «للشركات»: anyone (no login) asks for a company account; staff follow up from admin → الشركات. */
import { revalidatePath } from "next/cache";
import { addCompanyRequest, countRecentCompanyRequests } from "@/db/lib/company-requests";
import { actionFailure, invalid, ok, type ActionResult } from "@/lib/action-result";
import { formObject } from "@/lib/validation/fields";
import { companyRequestInputSchema } from "@/lib/validation/company";

export async function requestCompanyAccountAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = companyRequestInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  try {
    // one request a day per phone is plenty; a repeat says "received" without adding a row
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if ((await countRecentCompanyRequests(parsed.data.phone, since)) === 0)
      await addCompanyRequest(parsed.data);
  } catch (error) {
    return actionFailure("requestCompanyAccount", error);
  }
  revalidatePath("/admin/companies");
  return ok();
}
