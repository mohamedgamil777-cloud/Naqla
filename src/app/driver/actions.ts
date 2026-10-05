"use server";
/**
 * Driver-facing actions. A driver may only advance the status of a trip that is
 * assigned to them, and only along the natural path they control on the road:
 *   confirmed / ready → active   ("بدأت الرحلة")
 *   active            → completed ("سلّمت العربية")
 * Identity comes from the signed session cookie (their login phone), matched to
 * a staff row with role = driver. Never trust a driverId from the client.
 */
import { revalidatePath } from "next/cache";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { fireNotify, deliveryCustomerMessage } from "@/services/notify";

export interface DriverActionState {
  ok: boolean;
  error?: string;
}

async function currentDriver() {
  const session = await getSession();
  if (!session) return null;
  const staff = await repo.getStaffByPhone(session.phone);
  return staff && staff.role === "driver" ? staff : null;
}

export async function driverAdvanceTrip(
  _prev: DriverActionState,
  fd: FormData
): Promise<DriverActionState> {
  const driver = await currentDriver();
  if (!driver) return { ok: false, error: "مش مسجّل كسائق" };

  const code = String(fd.get("code") ?? "");
  const to = String(fd.get("to") ?? "");
  if (to !== "active" && to !== "completed") return { ok: false, error: "أمر غير معروف" };

  const booking = await repo.getBooking(code);
  if (!booking) return { ok: false, error: "الرحلة مش موجودة" };
  if (booking.driverId !== driver.id) return { ok: false, error: "الرحلة دي مش ليك" };

  // Guard the transition so a tap can't jump the lifecycle.
  const allowed =
    (to === "active" && (booking.status === "confirmed" || booking.status === "ready")) ||
    (to === "completed" && booking.status === "active");
  if (!allowed) return { ok: false, error: "مش وقت الخطوة دي" };

  await repo.adminUpdateBookingStatus(code, to);
  revalidatePath("/driver");
  return { ok: true };
}

/** Driver advances their own delivery order: assigned → en_route → completed. */
export async function driverAdvanceOrder(
  _prev: DriverActionState,
  fd: FormData
): Promise<DriverActionState> {
  const driver = await currentDriver();
  if (!driver) return { ok: false, error: "مش مسجّل كسائق" };

  const code = String(fd.get("code") ?? "");
  const to = String(fd.get("to") ?? "");
  if (to !== "en_route" && to !== "completed") return { ok: false, error: "أمر غير معروف" };

  const order = await repo.getDeliveryOrder(code);
  if (!order) return { ok: false, error: "الطلب مش موجود" };
  if (order.driverId !== driver.id) return { ok: false, error: "الطلب ده مش ليك" };

  const allowed =
    (to === "en_route" && order.status === "assigned") ||
    (to === "completed" && order.status === "en_route");
  if (!allowed) return { ok: false, error: "مش وقت الخطوة دي" };

  await repo.updateDeliveryOrderStatus(code, to);
  fireNotify(
    order.contactPhone,
    deliveryCustomerMessage(to === "en_route" ? "en_route" : "completed", code, order.driverName)
  );
  revalidatePath("/driver");
  return { ok: true };
}
