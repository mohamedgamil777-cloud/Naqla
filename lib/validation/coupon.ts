import { z } from "zod";
import { egpToPiastres } from "@/lib/money";
import { selectPromoCodeSchema } from "@/db/schema";
import {
  checkbox,
  choice,
  egpAmount,
  optionalId,
  optionalIsoDate,
  optionalNumber,
  requiredText,
} from "./fields";

/** Admin coupon form. `value` is a percent (1–100) or an EGP amount (→ piastres). */
export const couponInputSchema = z
  .object({
    id: optionalId(),
    code: requiredText("اكتب كود الكوبون.", 40),
    type: choice(selectPromoCodeSchema.shape.type.options, "اختار نوع الخصم."),
    value: optionalNumber("اكتب قيمة الخصم.", { min: 0 }),
    minValue: egpAmount("الحد الأدنى مش صحيح."),
    validTo: optionalIsoDate("تاريخ الانتهاء مش صحيح."),
    maxUses: optionalNumber("عدد مرات الاستخدام مش صحيح.", { min: 0 }).transform((v) =>
      v != null && v > 0 ? Math.round(v) : null,
    ),
    active: checkbox(),
  })
  .superRefine((c, ctx) => {
    if (c.value == null || c.value <= 0)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "اكتب قيمة الخصم." });
    else if (c.type === "pct" && c.value > 100)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "النسبة لازم تكون من 1 لـ 100." });
  })
  .transform(({ value, ...c }) => ({
    ...c,
    value: c.type === "pct" ? Math.round(value!) : egpToPiastres(value!),
  }));
