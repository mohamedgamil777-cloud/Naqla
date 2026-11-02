/** Customer account: identity documents. */
import { z } from "zod";
import { selectDocumentSchema } from "@/db/schema";
import { choice, id, optionalIsoDate, requiredText } from "./fields";

export const documentInputSchema = z.object({
  type: choice(selectDocumentSchema.shape.type.options, "نوع غير صحيح."),
  url: requiredText("صوّر المستند الأول.", 3_000_000).refine(
    (u) => u.startsWith("data:") || u.startsWith("http"),
    "صوّر المستند الأول.",
  ),
  expiry: optionalIsoDate("تاريخ الانتهاء مش صحيح."),
});

export const documentRefSchema = z.object({ id: id("المستند مش موجود.") });
