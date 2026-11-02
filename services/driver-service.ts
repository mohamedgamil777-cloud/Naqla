/**
 * Driver rules shared by the website (server actions) and the mobile API.
 * Identity always comes from the session phone, matched to a staff row with role = driver.
 */
import { advanceBookingByDriver, getBooking } from "@/db/lib/bookings";
import { advanceDeliveryOrderByDriver, getDeliveryOrder } from "@/db/lib/delivery-orders";
import { getStaffByPhone } from "@/db/lib/staff";
import { fireNotify, deliveryCustomerMessage } from "@/services/notify";
import type { StaffDTO } from "@/types";

export async function driverByPhone(phone: string): Promise<StaffDTO | null> {
  const staff = await getStaffByPhone(phone);
  return staff && staff.role === "driver" ? staff : null;
}

/** assigned → en_route ("ابدأ الرحلة") → arrived ("تم الوصول لموقع الاستلام") → completed ("تم التوصيل"). */
export const NEXT_STEP = { en_route: "assigned", arrived: "en_route", completed: "arrived" } as const;
export type DriverStep = keyof typeof NEXT_STEP;

export type AdvanceResult = { ok: true } | { ok: false; error: string };

export async function advanceDeliveryOrder(
  driver: StaffDTO,
  code: string,
  to: string,
  pod?: { name?: string | null; photo?: string | null },
): Promise<AdvanceResult> {
  if (!(to in NEXT_STEP)) return { ok: false, error: "أمر غير معروف" };
  const step = to as DriverStep;

  // Proof of delivery is required to finish: who received it + a photo.
  let proof: { name: string; photo: string } | undefined;
  if (step === "completed") {
    const podName = (pod?.name ?? "").trim();
    const podPhoto = pod?.photo ?? "";
    if (podName.length < 2) return { ok: false, error: "اكتب اسم اللي استلم" };
    if (!podPhoto.startsWith("data:image/") || podPhoto.length > 3_000_000)
      return { ok: false, error: "صوّر الحاجة بعد التسليم" };
    proof = { name: podName.slice(0, 80), photo: podPhoto };
  }

  // The update itself checks ownership and the current step, so a stale screen or a double tap
  // can't move someone else's order or skip a step.
  const moved = await advanceDeliveryOrderByDriver(code, driver.id, NEXT_STEP[step], step, proof);
  if (!moved) {
    const order = await getDeliveryOrder(code);
    if (!order) return { ok: false, error: "الطلب مش موجود" };
    if (order.driverId !== driver.id) return { ok: false, error: "الطلب ده مش ليك" };
    return { ok: false, error: "مش وقت الخطوة دي" };
  }
  const order = await getDeliveryOrder(code);
  fireNotify(order?.contactPhone, deliveryCustomerMessage(step, code, order?.driverName));
  return { ok: true };
}

/** Rental trips: confirmed / ready → active ("بدأت الرحلة") → completed ("سلّمت العربية"). */
const TRIP_FROM = { active: ["confirmed", "ready"], completed: ["active"] } as const;

export async function advanceTrip(driver: StaffDTO, code: string, to: string): Promise<AdvanceResult> {
  if (to !== "active" && to !== "completed") return { ok: false, error: "أمر غير معروف" };
  const moved = await advanceBookingByDriver(code, driver.id, [...TRIP_FROM[to]], to);
  if (moved) return { ok: true };
  const booking = await getBooking(code);
  if (!booking) return { ok: false, error: "الرحلة مش موجودة" };
  if (booking.driverId !== driver.id) return { ok: false, error: "الرحلة دي مش ليك" };
  return { ok: false, error: "مش وقت الخطوة دي" };
}
