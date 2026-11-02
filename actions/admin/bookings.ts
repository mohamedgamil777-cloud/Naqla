"use server";
/** Admin → الحجوزات: agent bookings, the booking lifecycle and payments. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminAssignDriver, adminUpdateBookingStatus } from "@/db/lib/bookings";
import { listDrivers } from "@/db/lib/drivers";
import { addPayment, deletePayment, refundPayment } from "@/db/lib/payments";
import { requirePermission } from "@/lib/authz";
import { createBooking, extendBooking } from "@/services/booking-service";
import { actionFailure, fail, invalid, ok, throwActionFailure, type ActionResult } from "@/lib/action-result";
import { formObject } from "@/lib/validation/fields";
import {
  agentBookingInputSchema,
  bookingDriverInputSchema,
  bookingStatusInputSchema,
  extendBookingInputSchema,
  paymentInputSchema,
  paymentRefInputSchema,
} from "@/lib/validation/booking";

/** An agent books a vehicle for a customer. Agent bookings are confirmed on creation. */
export async function agentCreateBooking(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("booking:create");
  const parsed = agentBookingInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);

  let code: string;
  try {
    const result = await createBooking({ ...parsed.data, source: "agent" });
    if (!("code" in result)) return fail("العربية مش متاحة في الوقت ده، جرب ميعاد تاني.");
    code = result.code;
  } catch (error) {
    return actionFailure("agentCreateBooking", error, "حصلت مشكلة أثناء الحجز، حاول تاني.");
  }
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  redirect(`/admin/bookings/${code}`);
}

export async function adminSetBookingStatus(fd: FormData): Promise<void> {
  await requirePermission("booking:update");
  const parsed = bookingStatusInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  const { code, status } = parsed.data;
  try {
    await adminUpdateBookingStatus(code, status);
  } catch (error) {
    throwActionFailure("adminSetBookingStatus", error);
  }
  revalidatePath(`/admin/bookings/${code}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  revalidatePath("/admin/board");
}

const EXTEND_ERROR: Record<string, string> = {
  conflict: "مينفعش تمد الرحلة — فيه حجز تاني بعدها على نفس العربية. جرب مدة أقل.",
  closed: "الرحلة دي خلصت أو ملغية، مينفعش تتعدّل.",
  too_long: "المدة أطول من المسموح بيه.",
  bad_hours: "عدد ساعات غير صحيح.",
  price: "حصلت مشكلة في حساب السعر.",
  not_found: "الحجز مش موجود.",
};

export async function extendBookingAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("booking:update");
  const parsed = extendBookingInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { code, hours } = parsed.data;
  try {
    const res = await extendBooking(code, hours);
    if (!res.ok) return fail(EXTEND_ERROR[res.reason] ?? "مش قادر يعدّل الرحلة.");
  } catch (error) {
    return actionFailure("extendBooking", error);
  }
  revalidatePath(`/admin/bookings/${code}`);
  revalidatePath("/admin/finance");
  revalidatePath("/admin/board");
  revalidatePath("/admin");
  return ok();
}

export async function adminAssignDriverAction(fd: FormData): Promise<void> {
  await requirePermission("booking:update");
  const parsed = bookingDriverInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  const { code, driverId } = parsed.data;
  try {
    if (driverId && !(await listDrivers()).some((d) => d.id === driverId)) return;
    await adminAssignDriver(code, driverId);
  } catch (error) {
    throwActionFailure("adminAssignDriver", error);
  }
  revalidatePath(`/admin/bookings/${code}`);
}

export async function adminAddPayment(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requirePermission("payment:manage");
  const values = formObject(fd);
  const parsed = paymentInputSchema.safeParse({ ...values, bookingCode: values.code });
  if (!parsed.success) return invalid(parsed.error);
  try {
    const created = await addPayment(parsed.data);
    if (!created) return fail("الحجز مش موجود.");
  } catch (error) {
    return actionFailure("adminAddPayment", error);
  }
  revalidatePath(`/admin/bookings/${parsed.data.bookingCode}`);
  return ok();
}

export async function adminRefundPayment(fd: FormData): Promise<void> {
  await requirePermission("payment:manage");
  const parsed = paymentRefInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    await refundPayment(parsed.data.code, parsed.data.id);
  } catch (error) {
    throwActionFailure("adminRefundPayment", error);
  }
  revalidatePath(`/admin/bookings/${parsed.data.code}`);
}

export async function adminDeletePayment(fd: FormData): Promise<void> {
  await requirePermission("payment:manage");
  const parsed = paymentRefInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  try {
    await deletePayment(parsed.data.code, parsed.data.id);
  } catch (error) {
    throwActionFailure("adminDeletePayment", error);
  }
  revalidatePath(`/admin/bookings/${parsed.data.code}`);
}
