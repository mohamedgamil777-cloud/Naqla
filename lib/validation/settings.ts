/** Admin → الإعدادات: the branch and business rules. */
import { z } from "zod";
import { DEFAULTS } from "@/lib/constants";
import { optionalNumber, optionalText, requiredText } from "./fields";

export const branchInputSchema = z
  .object({
    name: requiredText("اكتب اسم الفرع.", 120),
    address: optionalText(300),
    open: optionalNumber("مواعيد العمل غير صحيحة.", { min: 0, max: 24 }).transform((v) => v ?? 8),
    close: optionalNumber("مواعيد العمل غير صحيحة.", { min: 0, max: 24 }).transform((v) => v ?? 22),
  })
  .refine((b) => b.open < b.close, "مواعيد العمل غير صحيحة.");

const setting = (fallback: number, message: string, max?: number) =>
  optionalNumber(message, { min: 0, max }).transform((v) => v ?? fallback);

export const businessInputSchema = z
  .object({
    bufferMinutes: setting(DEFAULTS.bufferMinutes, "الفاصل بين الحجوزات مش صحيح."),
    minHours: setting(DEFAULTS.minHours, "أقل مدة مش صحيحة."),
    maxHours: setting(DEFAULTS.maxHours, "أقصى مدة مش صحيحة."),
    advanceDays: setting(DEFAULTS.advanceDays, "أيام الحجز المسبق مش صحيحة."),
    nowLeadHours: setting(DEFAULTS.nowLeadHours, "مهلة «الآن» مش صحيحة."),
    freeCancelHours: setting(DEFAULTS.freeCancelHours, "مهلة الإلغاء مش صحيحة."),
    vatPercent: setting(0, "الضريبة من 0 لـ 100%.", 100),
    durationOptions: optionalText(200).transform((v) =>
      (v ?? "")
        .split(/[,،\s]+/)
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  })
  .refine((b) => b.minHours <= b.maxHours, "أقل مدة لازم تكون أقل من أقصى مدة.")
  .transform(({ vatPercent, durationOptions, ...b }) => ({
    ...b,
    vatRate: vatPercent / 100,
    ...(durationOptions.length ? { durationOptions } : {}),
  }));
