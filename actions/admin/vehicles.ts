"use server";
/** Admin → الأسطول: vehicles and their availability blocks. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createVehicleBlock, deleteVehicleBlock } from "@/db/lib/availability";
import { createVehicle, deleteVehicle, isDriver, setVehicleStatus, updateVehicle } from "@/db/lib/vehicles";
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
    if (id.data) {
      const updated = await updateVehicle(id.data, parsed.data);
      if (!updated) return fail("العربية مش موجودة.");
    } else {
      await createVehicle(parsed.data);
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
    await setVehicleStatus(parsed.data.id, parsed.data.status);
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
    await deleteVehicle(parsed.data.id);
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
  } catch (error) {
    throwActionFailure("deleteVehicleBlock", error);
  }
  if (values.vehicleId) revalidatePath(`/admin/fleet/${values.vehicleId}/edit`);
  revalidatePath("/admin/board");
}
