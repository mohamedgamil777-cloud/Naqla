"use server";
/** Admin → الإعدادات: the branch and the business rules. */
import { revalidatePath } from "next/cache";
import { defaultBranch, updateBranch } from "@/db/lib/branches";
import { getBusiness, updateBusiness } from "@/db/lib/settings";
import { audit, changes } from "@/services/audit";
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
    const prev = await defaultBranch();
    await updateBranch({ name, address, working: { open, close } });
    const diff = changes({ name: prev.name, address: prev.address, open: prev.working.open, close: prev.working.close }, { name, address, open, close });
    if (Object.keys(diff.after).length) await audit({ action: "settings.branch", entity: "settings", label: name, ...diff });
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
    const prev = await getBusiness();
    await updateBusiness(parsed.data);
    const diff = changes(prev, parsed.data);
    if (Object.keys(diff.after).length) await audit({ action: "settings.business", entity: "settings", ...diff });
  } catch (error) {
    return actionFailure("saveBusiness", error);
  }
  revalidatePath("/admin/settings");
  return ok();
}
