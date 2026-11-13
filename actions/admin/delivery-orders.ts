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
import { audit } from "@/services/audit";
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
  await audit({
    action: "order.create",
    entity: "delivery_order",
    entityId: code,
    label: `طلب ${code}`,
    after: { customer: order.contactName, phone: order.contactPhone, from: order.pickupAddress, to: order.dropoffAddress },
  });
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
    const prev = await getDeliveryOrder(parsed.data.code);
    await changeDeliveryOrderSize(parsed.data.code, parsed.data.categoryId);
    const next = await getDeliveryOrder(parsed.data.code);
    if (prev && next && prev.sizeName !== next.sizeName) {
      await audit({
        action: "order.size",
        entity: "delivery_order",
        entityId: prev.code,
        label: `طلب ${prev.code}`,
        before: { size: prev.sizeName, total: prev.priceSnapshot.total },
        after: { size: next.sizeName, total: next.priceSnapshot.total },
      });
    }
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
    const prev = await getDeliveryOrder(code);
    const updated = await updateDeliveryOrderStatus(code, status);
    if (updated && prev?.status !== status) {
      await audit({
        action: status === "cancelled" ? "order.cancel" : "order.status",
        entity: "delivery_order",
        entityId: code,
        label: `طلب ${code}${prev?.contactName ? ` — ${prev.contactName}` : ""}`,
        before: { orderStatus: prev?.status ?? null },
        after: { orderStatus: status },
      });
    }
    if (updated && (status === "confirmed" || status === "completed")) {
      fireNotify(prev?.contactPhone, deliveryCustomerMessage(status, code));
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
    const prev = await getDeliveryOrder(parsed.data.code);
    if (await setDriverFee(parsed.data.code, parsed.data.fee)) {
      await audit({
        action: "order.driver_fee",
        entity: "delivery_order",
        entityId: parsed.data.code,
        label: `طلب ${parsed.data.code}`,
        before: { driverFee: prev?.driverFee ?? null },
        after: { driverFee: Math.max(0, Math.round(parsed.data.fee)) },
      });
    }
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
    const order = await getDeliveryOrder(code);
    if (undo) {
      if (order?.cashReceived != null && (await setDeliveryCash(code, null, null))) await audit({
        action: "order.cash_undo",
        entity: "delivery_order",
        entityId: code,
        label: `طلب ${code}`,
        before: { cash: order?.cashReceived ?? null },
      });
    } else if (order) {
      // empty amount = the order total (read from the stored price, never from the client)
      const received = amount == null ? order.priceSnapshot.total : egpToPiastres(amount);
      if (await setDeliveryCash(code, received, await getAdminName())) await audit({
        action: "order.cash",
        entity: "delivery_order",
        entityId: code,
        label: `طلب ${code}`,
        before: order.cashReceived != null ? { cash: order.cashReceived } : null,
        after: { cash: received, total: order.priceSnapshot.total },
      });
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
    const prev = await getDeliveryOrder(code);
    const logDriver = (name: string | null) =>
      audit({
        action: "order.driver",
        entity: "delivery_order",
        entityId: code,
        label: `طلب ${code}`,
        before: { driver: prev?.driverName ?? null },
        after: { driver: name },
      });
    if (driverId) {
      const driver = (await listDrivers()).find((d) => d.id === driverId);
      if (!driver) return;
      if (!(await assignDeliveryDriver(code, driver.id))) return;
      await logDriver(driver.name);
      const order = await getDeliveryOrder(code);
      fireNotify(order?.contactPhone, deliveryCustomerMessage("assigned", code, order?.driverName));
      fireNotify(driver.phone, `عندك توصيلة جديدة 🚚\nرقم الطلب: ${code}\nافتح التطبيق لتشوف التفاصيل.`);
    } else {
      if (await assignDeliveryDriver(code, null)) await logDriver(null);
    }
  } catch (error) {
    throwActionFailure("assignDeliveryDriver", error);
  }
  revalidatePath("/admin/orders");
}
