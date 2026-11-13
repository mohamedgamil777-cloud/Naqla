"use server";
/** Admin → أنواع العربيات: vehicle types / delivery size classes. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCategory, deleteCategory, listCategories, updateCategory } from "@/db/lib/categories";
import { requirePermission } from "@/lib/authz";
import { audit, changes } from "@/services/audit";
import { errorMsgs } from "@/lib/errors";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { formObject, optionalId, rowRefSchema } from "@/lib/validation/fields";
import { categoryInputSchema, renameCategoryInputSchema } from "@/lib/validation/vehicle";

export async function saveCategory(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("category:manage");
  const values = formObject(fd);
  const parsed = categoryInputSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  const id = optionalId().safeParse(values.id);
  if (!id.success) return fail(errorMsgs.NotFound);

  try {
    if (id.data) {
      const prev = (await listCategories()).find((c) => c.id === id.data);
      await updateCategory(id.data, parsed.data);
      const diff = changes(prev, parsed.data);
      if (Object.keys(diff.after).length)
        await audit({ action: "category.update", entity: "category", entityId: id.data, label: parsed.data.name, ...diff });
    } else {
      const created = await createCategory(parsed.data);
      await audit({
        action: "category.create",
        entity: "category",
        entityId: created.id,
        label: parsed.data.name,
        after: { baseFare: parsed.data.baseFare, perKm: parsed.data.perKm },
      });
    }
  } catch (error) {
    return actionFailure("saveCategory", error);
  }
  revalidatePath("/", "layout"); // home + order screen show these
  return ok();
}

/** Quick show/hide of a car type for customers (hidden types stay on old orders). */
export async function toggleCategoryActive(fd: FormData): Promise<void> {
  await requirePermission("category:manage");
  const parsed = rowRefSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    const category = (await listCategories()).find((c) => c.id === parsed.data.id);
    if (category) {
      await updateCategory(category.id, {
        name: category.name,
        kind: category.kind,
        active: !category.active,
      });
      await audit({
        action: "category.toggle",
        entity: "category",
        entityId: category.id,
        label: category.name,
        before: { active: category.active },
        after: { active: !category.active },
      });
    }
  } catch (error) {
    throwActionFailure("toggleCategoryActive", error);
  }
  revalidatePath("/", "layout");
}

export async function renameCategory(fd: FormData): Promise<void> {
  await requirePermission("category:manage");
  const parsed = renameCategoryInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    const prev = (await listCategories()).find((c) => c.id === parsed.data.id);
    await updateCategory(parsed.data.id, { name: parsed.data.name, kind: parsed.data.kind });
    const diff = changes(prev, { name: parsed.data.name, kind: parsed.data.kind });
    if (Object.keys(diff.after).length)
      await audit({ action: "category.update", entity: "category", entityId: parsed.data.id, label: parsed.data.name, ...diff });
  } catch (error) {
    throwActionFailure("renameCategory", error);
  }
  revalidatePath("/admin/categories");
  revalidatePath("/admin/fleet");
}

/** Refused for types used by vehicles/orders (the UI offers "hide" instead). */
export async function deleteCategoryAction(fd: FormData): Promise<void> {
  await requirePermission("category:manage");
  const parsed = rowRefSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    const prev = (await listCategories()).find((c) => c.id === parsed.data.id);
    const res = await deleteCategory(parsed.data.id);
    if (res.ok) await audit({ action: "category.delete", entity: "category", entityId: parsed.data.id, label: prev?.name ?? null });
  } catch (error) {
    throwActionFailure("deleteCategory", error);
  }
  revalidatePath("/", "layout");
  redirect("/admin/categories");
}
