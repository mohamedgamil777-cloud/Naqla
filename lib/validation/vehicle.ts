/** Admin fleet forms: vehicles, vehicle types (categories) and availability blocks. */
import { z } from "zod";
import { selectVehicleBlockSchema, selectVehicleCategorySchema, selectVehicleSchema } from "@/db/schema";
import {
  checkbox,
  choice,
  egpAmount,
  id,
  isoDate,
  optionalNumber,
  optionalText,
  requiredNumber,
  requiredText,
} from "./fields";

const vehicleStatus = selectVehicleSchema.shape.status;
const transmission = selectVehicleSchema.shape.transmission.unwrap();
const fuel = selectVehicleSchema.shape.fuel.unwrap();

const pricingSchema = z
  .object({
    hour1: egpAmount("سعر الساعة مش صحيح."),
    hour2: egpAmount("سعر الساعتين مش صحيح."),
    hour4: egpAmount("سعر الـ 4 ساعات مش صحيح."),
    hour8: egpAmount("سعر الـ 8 ساعات مش صحيح."),
    daily: egpAmount("سعر اليوم مش صحيح."),
    extraHour: egpAmount("سعر الساعة الإضافية مش صحيح."),
    deposit: egpAmount("التأمين مش صحيح."),
    driverFeePerHour: egpAmount("أجر السائق مش صحيح."),
    loaderFeePerPerson: egpAmount("أجر العامل مش صحيح."),
    perKmPrice: egpAmount("سعر الكيلو مش صحيح."),
    deliveryFee: egpAmount("رسوم التوصيل مش صحيحة."),
  })
  .refine((p) => p.hour1 > 0 || p.hour2 > 0 || p.hour4 > 0 || p.hour8 > 0, "حدد سعر ساعة واحدة على الأقل.");

/** FormData → vehicle. Prices are typed in EGP and become piastres. */
export const vehicleInputSchema = z.object({
  name: requiredText("اكتب اسم العربية.", 120),
  plate: requiredText("اكتب رقم اللوحة.", 40),
  categoryId: id("اختار النوع."),
  brand: optionalText(80),
  model: optionalText(80),
  year: optionalNumber("سنة الصنع مش صحيحة.", { min: 1950, max: 2100, int: true }),
  color: optionalText(40),
  transmission: optionalText(20)
    .pipe(transmission.nullable())
    .transform((v) => v ?? "manual"),
  fuel: optionalText(20)
    .pipe(fuel.nullable())
    .transform((v) => v ?? "benzine"),
  seats: optionalNumber("عدد الكراسي مش صحيح.", { min: 0, max: 100, int: true }),
  cargoKg: optionalNumber("الحمولة مش صحيحة.", { min: 0 }),
  hasDriverOption: checkbox(),
  status: optionalText(20)
    .pipe(vehicleStatus.nullable())
    .transform((v) => v ?? "available"),
  imageUrl: optionalText(3_000_000),
  pricing: pricingSchema,
});

/** The pricing fields sit flat in the form; group them for the schema. */
export function vehicleFormValues(values: Record<string, string>) {
  return {
    ...values,
    pricing: {
      hour1: values.hour1,
      hour2: values.hour2,
      hour4: values.hour4,
      hour8: values.hour8,
      daily: values.daily,
      extraHour: values.extraHour,
      deposit: values.deposit,
      driverFeePerHour: values.driverFee,
      loaderFeePerPerson: values.loaderFee,
      perKmPrice: values.perKm,
      deliveryFee: values.deliveryFee,
    },
  };
}

export const vehicleStatusInputSchema = z.object({
  id: id("العربية مش موجودة."),
  status: choice(vehicleStatus.options, "حالة غير معروفة."),
});

const kind = selectVehicleCategorySchema.shape.kind;
const sizeCode = selectVehicleCategorySchema.shape.sizeCode.unwrap();

export const categoryInputSchema = z.object({
  name: requiredText("اكتب اسم النوع.", 80),
  kind: choice(kind.options, "اختار الفئة."),
  sizeCode: optionalText(4).transform((v) => (v && sizeCode.safeParse(v).success ? sizeCode.parse(v) : null)),
  active: checkbox(),
  sort: optionalNumber("الترتيب مش صحيح.").transform((v) => (v == null ? undefined : Math.round(v))),
  capacityKg: optionalNumber("الحمولة مش صحيحة.", { min: 0 }),
  dims: optionalText(80),
  description: optionalText(500),
  image: optionalText(3_000_000),
  baseFare: egpAmount("فتحة العداد مش صحيحة."),
  perKm: egpAmount("سعر الكيلو مش صحيح."),
});

export const renameCategoryInputSchema = categoryInputSchema.pick({ name: true, kind: true }).extend({
  id: id("النوع مش موجود."),
});

export const vehicleBlockInputSchema = z
  .object({
    vehicleId: id("اختار العربية."),
    date: isoDate("اختار اليوم."),
    from: requiredNumber("المواعيد غير صحيحة.", { min: 0, max: 24 }),
    to: requiredNumber("المواعيد غير صحيحة.", { min: 0, max: 24 }),
    reason: optionalText(20)
      .pipe(selectVehicleBlockSchema.shape.reason.nullable())
      .transform((v) => v ?? "block"),
    note: optionalText(500),
  })
  .refine((b) => b.from < b.to, "المواعيد غير صحيحة.");
