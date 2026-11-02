/** Driver payouts (تسديدات) and expenses (نثريات). */
import { z } from "zod";
import { selectDriverPayoutSchema } from "@/db/schema";
import { choice, id, optionalText, positiveEgpAmount, requiredText } from "./fields";

export const driverPayoutInputSchema = z.object({
  driverId: id("اختار السائق."),
  amount: positiveEgpAmount("اكتب المبلغ."),
  method: choice(selectDriverPayoutSchema.shape.method.options, "اختار طريقة الدفع."),
  note: optionalText(500),
});

export const expenseInputSchema = z.object({
  amount: positiveEgpAmount("اكتب المبلغ."),
  category: requiredText("اكتب نوع النثرية.", 80),
  note: optionalText(500),
});
