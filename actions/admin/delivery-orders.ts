"use server";
/** Admin → طلبات التوصيل: phone orders and order management. Every action re-checks the permission. */
import { revalidatePath } from "next/cache";
import {
  assignDeliveryDriver,
  getDeliveryOrder,
  setDeliveryCash,
  setDriverFee,
  updateDeliveryOrderStatus,
} from "@/db/lib/delivery-orders";
import { listDrivers } from "@/db/lib/drivers";
import { requirePermission } from "@/lib/authz";
import { getAdminName } from "@/services/admin-auth";
import {
  changeDeliveryOrderSize,
  createDeliveryOrder,
  estimateDelivery,
  resolveOrderSchedule,
  type DeliveryEstimate,
} from "@/services/delivery-service";
import { deliveryCustomerMessage, fireNotify } from "@/services/notify";
import { egpToPiastres } from "@/lib/money";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { formObject } from "@/lib/validation/fields";
import {
  driverFeeInputSchema,
  orderCashInputSchema,
  orderDriverInputSchema,
  orderSizeInputSchema,
  orderStatusInputSchema,
  phoneOrderInputSchema,
  phoneOrderQuoteSchema,
} from "@/lib/validation/delivery-order";

export type PhoneOrderState = ActionResult<{ code: string }>;

/** Live price while the agent fills the form (same server pricing as the customer site). */
export async function quotePhoneOrder(input: {
  categoryId: string;
  km: number;
  loaders: number;
  promoCode: string;
  companyId: string;
}): Promise<DeliveryEstimate | null> {
  await requirePermission("delivery:create");
  const parsed = phoneOrderQuoteSchema.safeParse(input);
  if (!parsed.success || !parsed.data.categoryId || !(parsed.data.km > 0)) return null;
  const q = parsed.data;
  try {
    return await estimateDelivery({
      categoryId: q.categoryId,
      km: q.km,
      loaders: q.loaders,
      promoCode: q.companyId ? null : q.promoCode || null,
      companyId: q.companyId || null,
    });
  } catch (error) {
    actionFailure("quotePhoneOrder", error);
    return null;
  }
}

const SCHEDULE_ERROR: Record<string, string> = {
  PAST: "الميعاد لازم يكون بعد مهلة التجهيز من دلوقتي.",
  HOURS: "الميعاد برّه مواعيد العمل.",
  TOO_FAR: "الميعاد أبعد من أقصى أيام الحجز المسبق.",
};

/** An agent takes an order on the phone. It starts confirmed; the price is computed on the server. */
export async function createPhoneOrder(_prev: PhoneOrderState, fd: FormData): Promise<PhoneOrderState> {
  await requirePermission("delivery:create");
  const parsed = phoneOrderInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { date, time, ...order } = parsed.data;

  let code: string;
  try {
    const when = await resolveOrderSchedule(date, time);
    if (!when.ok) return fail(SCHEDULE_ERROR[when.reason]);

    const result = await createDeliveryOrder({
      ...order,
      scheduledAt: when.scheduledAt,
      agentName: await getAdminName(),
    });
    if (!result.ok) {
      return fail(
        result.reason === "CREDIT"
          ? "الشركة وصلت للحد الائتماني — لازم تسدّد الأول."
          : "الحجم ده مش متاح، اختار حجم تاني.",
      );
    }
    code = result.code;
  } catch (error) {
    return actionFailure("createPhoneOrder", error);
  }
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return ok({ code });
}

/** Switch an order to another truck size; the price is recomputed on the server. */
export async function changeOrderSizeAction(fd: FormData): Promise<void> {
  await requirePermission("delivery:update");
  const parsed = orderSizeInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    await changeDeliveryOrderSize(parsed.data.code, parsed.data.categoryId);
  } catch (error) {
    throwActionFailure("changeOrderSize", error);
  }
  revalidatePath("/admin/orders");
  revalidatePath("/bookings");
}

export async function setDeliveryOrderStatus(fd: FormData): Promise<void> {
  await requirePermission("delivery:update");
  const parsed = orderStatusInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  const { code, status } = parsed.data;
  try {
    const updated = await updateDeliveryOrderStatus(code, status);
    if (updated && (status === "confirmed" || status === "completed")) {
      const order = await getDeliveryOrder(code);
      fireNotify(order?.contactPhone, deliveryCustomerMessage(status, code));
    }
  } catch (error) {
    throwActionFailure("setDeliveryOrderStatus", error);
  }
  revalidatePath("/admin/orders");
}

export async function setDriverFeeAction(fd: FormData): Promise<void> {
  await requirePermission("delivery:cash");
  const parsed = driverFeeInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    await setDriverFee(parsed.data.code, parsed.data.fee);
  } catch (error) {
    throwActionFailure("setDriverFee", error);
  }
  revalidatePath("/admin/orders");
}

/** Record (or undo) the cash a driver handed in for a completed cash order. */
export async function setOrderCashAction(fd: FormData): Promise<void> {
  await requirePermission("delivery:cash");
  const parsed = orderCashInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  const { code, undo, amount } = parsed.data;
  try {
    if (undo) {
      await setDeliveryCash(code, null, null);
    } else {
      // empty amount = the order total (read from the stored price, never from the client)
      const order = await getDeliveryOrder(code);
      if (order) {
        const received = amount == null ? order.priceSnapshot.total : egpToPiastres(amount);
        await setDeliveryCash(code, received, await getAdminName());
      }
    }
  } catch (error) {
    throwActionFailure("setOrderCash", error);
  }
  revalidatePath("/admin/orders");
  revalidatePath("/admin/finance");
}

export async function assignDeliveryDriverAction(fd: FormData): Promise<void> {
  await requirePermission("delivery:update");
  const parsed = orderDriverInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  const { code, driverId } = parsed.data;
  try {
    if (driverId) {
      const driver = (await listDrivers()).find((d) => d.id === driverId);
      if (!driver) return;
      if (!(await assignDeliveryDriver(code, driver.id))) return;
      const order = await getDeliveryOrder(code);
      fireNotify(order?.contactPhone, deliveryCustomerMessage("assigned", code, order?.driverName));
      fireNotify(driver.phone, `عندك توصيلة جديدة 🚚\nرقم الطلب: ${code}\nافتح التطبيق لتشوف التفاصيل.`);
    } else {
      await assignDeliveryDriver(code, null);
    }
  } catch (error) {
    throwActionFailure("assignDeliveryDriver", error);
  }
  revalidatePath("/admin/orders");
}
