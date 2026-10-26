/**
 * Driver rules shared by the website (server actions) and the mobile API.
 * Identity always comes from the session phone, matched to a staff row with role = driver.
 */
import { repo } from "@/data/repo";
import { fireNotify, deliveryCustomerMessage } from "@/services/notify";
import type { StaffDTO } from "@/data/types";

export async function driverByPhone(phone: string): Promise<StaffDTO | null> {
  const staff = await repo.getStaffByPhone(phone);
  return staff && staff.role === "driver" ? staff : null;
}

/** assigned → en_route ("ابدأ الرحلة") → arrived ("تم الوصول لموقع الاستلام") → completed ("تم التوصيل"). */
export const NEXT_STEP: Record<string, string> = { en_route: "assigned", arrived: "en_route", completed: "arrived" };

export type AdvanceResult = { ok: true } | { ok: false; error: string };

export async function advanceDeliveryOrder(
  driver: StaffDTO,
  code: string,
  to: string,
  pod?: { name?: string; photo?: string },
): Promise<AdvanceResult> {
  if (!(to in NEXT_STEP)) return { ok: false, error: "أمر غير معروف" };

  const order = await repo.getDeliveryOrder(code);
  if (!order) return { ok: false, error: "الطلب مش موجود" };
  if (order.driverId !== driver.id) return { ok: false, error: "الطلب ده مش ليك" };
  if (order.status !== NEXT_STEP[to]) return { ok: false, error: "مش وقت الخطوة دي" };

  const status = to as "en_route" | "arrived" | "completed";
  // Proof of delivery is required to finish: who received it + a photo.
  if (status === "completed") {
    const podName = (pod?.name ?? "").trim();
    const podPhoto = pod?.photo ?? "";
    if (podName.length < 2) return { ok: false, error: "اكتب اسم اللي استلم" };
    if (!podPhoto.startsWith("data:image/") || podPhoto.length > 3_000_000) return { ok: false, error: "صوّر الحاجة بعد التسليم" };
    await repo.setDeliveryPod(code, podName.slice(0, 80), podPhoto);
  }
  await repo.updateDeliveryOrderStatus(code, status);
  fireNotify(order.contactPhone, deliveryCustomerMessage(status, code, order.driverName));
  return { ok: true };
}
