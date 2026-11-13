"use server";
/** Admin → الأسطول: vehicles and their availability blocks. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createVehicleBlock, deleteVehicleBlock } from "@/db/lib/availability";
import { listCategories } from "@/db/lib/categories";
import {
  createVehicle,
  deleteVehicle,
  getVehicleForEdit,
  isDriver,
  setVehicleStatus,
  updateVehicle,
} from "@/db/lib/vehicles";
import { audit, changes } from "@/services/audit";
import { requirePermission } from "@/lib/authz";
import { cairoDateTime } from "@/lib/time";
import { PG_UNIQUE_VIOLATION, errorMsgs, pgErrorCode } from "@/lib/errors";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { formObject, optionalId, rowRefSchema } from "@/lib/validation/fields";
import {
  vehicleBlockInputSchema,
  vehicleFormValues,
  vehicleInputSchema,
  vehicleStatusInputSchema,
} from "@/lib/validation/vehicle";

export async function saveVehicle(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("fleet:manage");
  const values = formObject(fd);
  const parsed = vehicleInputSchema.safeParse(vehicleFormValues(values));
  if (!parsed.success) return invalid(parsed.error);
  const id = optionalId().safeParse(values.id);
  if (!id.success) return fail(errorMsgs.NotFound);

  try {
    if (parsed.data.driverId && !(await isDriver(parsed.data.driverId))) return fail("السواق ده مش موجود.");
    // photos are not compared (too big for the log)
    const { imageUrl: _i, ownerPhoto: _o, licensePhoto: _l, categoryId, ...fields } = parsed.data;
    const typeName = async (catId: string | null | undefined) =>
      (await listCategories()).find((c) => c.id === catId)?.name ?? null;
    if (id.data) {
      const prev = await getVehicleForEdit(id.data);
      const updated = await updateVehicle(id.data, parsed.data);
      if (!updated) return fail("العربية مش موجودة.");
      const diff = changes(
        prev ? { ...prev, ...prev.admin, kind: await typeName(prev.categoryId) } : null,
        { ...fields, kind: await typeName(categoryId) },
      );
      if (Object.keys(diff.after).length)
        await audit({ action: "vehicle.update", entity: "vehicle", entityId: id.data, label: `${parsed.data.name} (${parsed.data.plate})`, ...diff });
    } else {
      const created = await createVehicle(parsed.data);
      await audit({
        action: "vehicle.create",
        entity: "vehicle",
        entityId: created.id,
        label: `${parsed.data.name} (${parsed.data.plate})`,
        after: { kind: await typeName(categoryId), plate: parsed.data.plate, ownerName: parsed.data.ownerName },
      });
    }
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) return fail("رقم اللوحة ده مسجّل لعربية تانية.");
    return actionFailure("saveVehicle", error);
  }
  revalidatePath("/admin/fleet");
  redirect("/admin/fleet");
}

export async function setVehicleStatusAction(fd: FormData): Promise<void> {
  await requirePermission("fleet:manage");
  const parsed = vehicleStatusInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    const prev = await getVehicleForEdit(parsed.data.id);
    if ((await setVehicleStatus(parsed.data.id, parsed.data.status)) && prev?.status !== parsed.data.status) {
      await audit({
        action: "vehicle.status",
        entity: "vehicle",
        entityId: parsed.data.id,
        label: prev ? `${prev.name} (${prev.plate})` : null,
        before: { vehicleStatus: prev?.status ?? null },
        after: { vehicleStatus: parsed.data.status },
      });
    }
  } catch (error) {
    throwActionFailure("setVehicleStatus", error);
  }
  revalidatePath("/admin/fleet");
  revalidatePath("/admin");
  revalidatePath("/admin/board");
}

/** A vehicle with bookings is deactivated instead (its history stays). */
export async function deleteVehicleAction(fd: FormData): Promise<void> {
  await requirePermission("fleet:manage");
  const parsed = rowRefSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    const prev = await getVehicleForEdit(parsed.data.id);
    const res = await deleteVehicle(parsed.data.id);
    if (res.deleted || res.deactivated) {
      await audit({
        action: res.deleted ? "vehicle.delete" : "vehicle.status",
        entity: "vehicle",
        entityId: parsed.data.id,
        label: prev ? `${prev.name} (${prev.plate})` : null,
        before: { vehicleStatus: prev?.status ?? null, plate: prev?.plate ?? null },
        after: res.deleted ? null : { vehicleStatus: "inactive" },
      });
    }
  } catch (error) {
    throwActionFailure("deleteVehicle", error);
  }
  revalidatePath("/admin/fleet");
  redirect("/admin/fleet");
}

export async function addVehicleBlock(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("fleet:manage");
  const parsed = vehicleBlockInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { vehicleId, date, from, to, reason, note } = parsed.data;

  try {
    await createVehicleBlock({
      vehicleId,
      startsAt: cairoDateTime(date, from),
      endsAt: cairoDateTime(date, to),
      reason,
      note,
    });
    const v = await getVehicleForEdit(vehicleId);
    await audit({
      action: "vehicle.block_add",
      entity: "vehicle",
      entityId: vehicleId,
      label: v ? `${v.name} (${v.plate})` : null,
      after: { from: `${date} ${from}:00`, to: `${date} ${to}:00`, reason, note },
    });
  } catch (error) {
    if ((error as Error).message === "BLOCK_OVER_BOOKING") {
      return fail("فيه حجز موجود في الوقت ده، مينفعش تقفله.");
    }
    return actionFailure("addVehicleBlock", error);
  }
  revalidatePath(`/admin/fleet/${vehicleId}/edit`);
  revalidatePath("/admin/board");
  return ok();
}

export async function deleteVehicleBlockAction(fd: FormData): Promise<void> {
  await requirePermission("fleet:manage");
  const values = formObject(fd);
  const parsed = rowRefSchema.safeParse(values);
  if (!parsed.success) return;
  try {
    await deleteVehicleBlock(parsed.data.id);
    const v = values.vehicleId ? await getVehicleForEdit(values.vehicleId).catch(() => null) : null;
    await audit({
      action: "vehicle.block_delete",
      entity: "vehicle",
      entityId: values.vehicleId || null,
      label: v ? `${v.name} (${v.plate})` : null,
    });
  } catch (error) {
    throwActionFailure("deleteVehicleBlock", error);
  }
  if (values.vehicleId) revalidatePath(`/admin/fleet/${values.vehicleId}/edit`);
  revalidatePath("/admin/board");
}
