"use server";
/** Admin → الإعدادات: the branch and the business rules. */
import { revalidatePath } from "next/cache";
import { updateBranch } from "@/db/lib/branches";
import { updateBusiness } from "@/db/lib/settings";
import { requirePermission } from "@/lib/authz";
import { actionFailure, invalid, ok, type ActionResult } from "@/lib/action-result";
import { formObject } from "@/lib/validation/fields";
import { branchInputSchema, businessInputSchema } from "@/lib/validation/settings";

export async function saveBranch(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("settings:manage");
  const parsed = branchInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { name, address, open, close } = parsed.data;
  try {
    await updateBranch({ name, address, working: { open, close } });
  } catch (error) {
    return actionFailure("saveBranch", error);
  }
  revalidatePath("/admin/settings");
  revalidatePath("/admin/board");
  return ok();
}

export async function saveBusiness(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("settings:manage");
  const parsed = businessInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  try {
    await updateBusiness(parsed.data);
  } catch (error) {
    return actionFailure("saveBusiness", error);
  }
  revalidatePath("/admin/settings");
  return ok();
}
