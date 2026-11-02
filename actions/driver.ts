"use server";
/**
 * Driver-facing actions. Identity comes from the signed session cookie (their login phone), matched
 * to a staff row with role = driver — never a driverId from the client. A driver may only advance
 * their own trip/order, one step at a time (rules in services/driver-service).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setStaffAvailable } from "@/db/lib/drivers";
import { getSession } from "@/services/session";
import { advanceDeliveryOrder, advanceTrip, driverByPhone } from "@/services/driver-service";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { formObject, requiredText } from "@/lib/validation/fields";
import { advanceOrderInputSchema } from "@/lib/validation/delivery-order";

const NOT_A_DRIVER = "مش مسجّل كسائق";

async function currentDriver() {
  const session = await getSession();
  return session ? driverByPhone(session.phone) : null;
}

const tripStepSchema = advanceOrderInputSchema
  .pick({ code: true })
  .extend({ to: requiredText("أمر غير معروف", 20) });

/** confirmed / ready → active ("بدأت الرحلة") · active → completed ("سلّمت العربية"). */
export async function driverAdvanceTrip(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = tripStepSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  try {
    const driver = await currentDriver();
    if (!driver) return fail(NOT_A_DRIVER);
    const r = await advanceTrip(driver, parsed.data.code, parsed.data.to);
    if (!r.ok) return fail(r.error);
  } catch (error) {
    return actionFailure("driverAdvanceTrip", error);
  }
  revalidatePath("/driver");
  return ok();
}

/** Driver advances their own delivery order, one step at a time. */
export async function driverAdvanceOrder(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const values = formObject(fd);
  const parsed = advanceOrderInputSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  const { code, to, podName, podPhoto } = parsed.data;
  try {
    const driver = await currentDriver();
    if (!driver) return fail(NOT_A_DRIVER);
    const r = await advanceDeliveryOrder(driver, code, to, { name: podName, photo: podPhoto });
    if (!r.ok) return fail(r.error);
  } catch (error) {
    return actionFailure("driverAdvanceOrder", error);
  }
  revalidatePath("/driver");
  revalidatePath(`/driver/trip/${code}`);
  // Starting from the list jumps straight into the trip screen.
  if (values.open === "trip") redirect(`/driver/trip/${code}`);
  return ok();
}

/** Driver's own "متاح للعمل" toggle. */
export async function toggleAvailability(): Promise<void> {
  try {
    const driver = await currentDriver();
    if (!driver) return;
    await setStaffAvailable(driver.id, !driver.available);
  } catch (error) {
    throwActionFailure("toggleAvailability", error);
  }
  revalidatePath("/driver");
}
