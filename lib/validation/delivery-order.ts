/** A→B delivery orders: phone orders taken by agents and admin order management. */
import { z } from "zod";
import { selectDeliveryOrderSchema } from "@/db/schema";
import {
  checkbox,
  choice,
  egpAmount,
  egyptianMobile,
  id,
  isoDate,
  optionalId,
  optionalNumber,
  optionalText,
  requiredNumber,
  requiredText,
} from "./fields";

const code = () => requiredText("الطلب مش موجود.", 20);

export const phoneOrderInputSchema = z.object({
  contactName: requiredText("اكتب اسم العميل.", 120),
  contactPhone: egyptianMobile("رقم موبايل العميل مش صحيح."),
  categoryId: id("اختار حجم العربية."),
  km: requiredNumber("اكتب المسافة بالكيلو.", { min: 0.1, max: 1000 }),
  pickupAddress: requiredText("اكتب عنوان الاستلام والتسليم.", 300).refine(
    (v) => v.length >= 3,
    "اكتب عنوان الاستلام والتسليم.",
  ),
  dropoffAddress: requiredText("اكتب عنوان الاستلام والتسليم.", 300).refine(
    (v) => v.length >= 3,
    "اكتب عنوان الاستلام والتسليم.",
  ),
  date: isoDate("اختار اليوم والساعة."),
  time: requiredText("اختار اليوم والساعة.", 5).pipe(
    z.string().regex(/^\d{2}:\d{2}$/, "اختار اليوم والساعة."),
  ),
  loaders: optionalNumber("عدد العمال مش صحيح.", { min: 0, max: 10 }).transform((v) => Math.floor(v ?? 0)),
  /** expected trip time in minutes; empty = within the base fare's time */
  tripMinutes: optionalNumber("مدة الرحلة مش صحيحة.", { min: 0, max: 24 * 60 }).transform((v) =>
    v == null ? null : Math.round(v),
  ),
  loadSize: optionalText(10).transform((v) =>
    v === "few" || v === "room" || v === "flat2" || v === "flat3" ? v : null,
  ),
  pickupFloor: optionalNumber("دور التحميل مش صحيح.", { min: 0, max: 60, int: true }),
  pickupElevator: checkbox(),
  dropoffFloor: optionalNumber("دور التنزيل مش صحيح.", { min: 0, max: 60, int: true }),
  dropoffElevator: checkbox(),
  promoCode: optionalText(40),
  pickupDetails: optionalText(300),
  dropoffDetails: optionalText(300),
  cargoType: optionalText(120),
  notes: optionalText(1000),
  companyId: optionalId(),
});

/** Live price while the agent fills the form (called directly, not from FormData). */
export const phoneOrderQuoteSchema = z.object({
  categoryId: z.string(),
  km: z.number(),
  loaders: z.number().int().min(0).max(10).catch(0),
  tripMinutes: z.number().int().min(0).max(24 * 60).nullable().catch(null),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().catch(null),
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable().catch(null),
  loadSize: z.enum(["few", "room", "flat2", "flat3"]).nullable().catch(null),
  pickupFloor: z.number().int().min(0).max(60).nullable().catch(null),
  pickupElevator: z.boolean().catch(false),
  dropoffFloor: z.number().int().min(0).max(60).nullable().catch(null),
  dropoffElevator: z.boolean().catch(false),
  promoCode: z.string().max(40).catch(""),
  companyId: z.string().catch(""),
});

/** "assigned" only happens by choosing a driver, never by hand. */
export const ADMIN_ORDER_STATUSES = ["new", "confirmed", "completed", "cancelled"] as const;

export const orderStatusInputSchema = z.object({
  code: code(),
  status: choice(ADMIN_ORDER_STATUSES, "حالة غير معروفة."),
});

export const orderSizeInputSchema = z.object({ code: code(), categoryId: id("اختار الحجم.") });

export const orderDriverInputSchema = z.object({ code: code(), driverId: optionalId() });

export const driverFeeInputSchema = z.object({ code: code(), fee: egpAmount("الأجر مش صحيح.") });

export const orderCashInputSchema = z.object({
  code: code(),
  undo: z.preprocess((v) => v === "1", z.boolean()),
  /** empty = the order total */
  amount: optionalNumber("المبلغ مش صحيح.", { min: 0 }),
});

/** Driver app: advance an order one step (proof of delivery required to finish). */
export const DRIVER_STEPS = ["en_route", "arrived", "completed"] as const;

export const advanceOrderInputSchema = z.object({
  code: code(),
  to: choice(DRIVER_STEPS, "أمر غير معروف"),
  podName: optionalText(80),
  podPhoto: optionalText(3_000_000),
});

export const rateOrderInputSchema = z.object({
  code: code(),
  rating: requiredNumber("اختار تقييم من 1 لـ 5", { min: 1, max: 5, int: true }),
  comment: optionalText(500),
});

export type DeliveryStatus = z.infer<typeof selectDeliveryOrderSchema>["status"];

/** JSON API fields (customer site / phone apps): load size and floors at each end. All optional. */
export const tripLoadJson = {
  loadSize: z.enum(["few", "room", "flat2", "flat3"]).optional().nullable(),
  pickupFloor: z.number().int().min(0).max(60).optional().nullable(),
  pickupElevator: z.boolean().optional().nullable(),
  dropoffFloor: z.number().int().min(0).max(60).optional().nullable(),
  dropoffElevator: z.boolean().optional().nullable(),
};
