/** Rental bookings: agent bookings, lifecycle, extensions and payments. */
import { z } from "zod";
import { selectBookingSchema, selectPaymentSchema } from "@/db/schema";
import {
  checkbox,
  choice,
  egyptianMobile,
  id,
  optionalId,
  optionalNumber,
  optionalText,
  positiveEgpAmount,
  requiredNumber,
  requiredText,
} from "./fields";

const code = (message = "الحجز مش موجود.") => requiredText(message, 20);

export const agentBookingInputSchema = z.object({
  vehicleId: id("اختار العربية."),
  startISO: requiredText("اختار ميعاد الاستلام.", 40).refine(
    (v) => !Number.isNaN(Date.parse(v)),
    "اختار ميعاد الاستلام.",
  ),
  hours: requiredNumber("اختار مدة الإيجار.", { min: 1, max: 24 * 31 }),
  contactName: requiredText("اكتب اسم العميل.", 120),
  contactPhone: egyptianMobile("رقم موبايل العميل مش صحيح."),
  agentName: optionalText(120),
  withDriver: checkbox(),
  withDelivery: checkbox(),
  loaders: optionalNumber("عدد العمال مش صحيح.", { min: 0, max: 10, int: true }).transform((v) => v ?? 0),
  promoCode: optionalText(40),
});

export const bookingStatusInputSchema = z.object({
  code: code(),
  status: choice(selectBookingSchema.shape.status.options, "حالة غير معروفة."),
});

export const extendBookingInputSchema = z.object({
  code: code("حصلت مشكلة."),
  hours: requiredNumber("اكتب عدد الساعات الجديد.", { min: 1 }),
});

export const bookingDriverInputSchema = z.object({
  code: code(),
  driverId: optionalId(),
});

export const paymentInputSchema = z.object({
  bookingCode: code("حصلت مشكلة."),
  method: choice(selectPaymentSchema.shape.method.options, "اختار طريقة الدفع."),
  kind: choice(selectPaymentSchema.shape.kind.options, "اختار نوع الدفعة."),
  amount: positiveEgpAmount("اكتب المبلغ."),
  note: optionalText(500),
});

export const paymentRefInputSchema = z.object({
  id: id("الدفعة مش موجودة."),
  code: code(),
});
