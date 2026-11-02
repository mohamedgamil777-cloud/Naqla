/** Admin → محتوى التطبيق: one JSON document, edited one section per form. */
import { z } from "zod";
import type { CargoIcon, FaqTopic } from "@/lib/content";
import { choice, egpAmount, optionalText, requiredNumber, requiredText } from "./fields";

const FAQ_TOPIC_IDS = [
  "order",
  "price",
  "driver",
  "payment",
  "cancel",
] as const satisfies readonly FaqTopic[];
const CARGO_ICONS = ["file", "box", "sofa", "home", "truck"] as const satisfies readonly CargoIcon[];

export const contactInputSchema = z.object({
  supportPhone: requiredText("اكتب رقم خدمة العملاء (خط ساخن أو موبايل).", 40).refine(
    (v) => v.replace(/\D/g, "").length >= 3,
    "اكتب رقم خدمة العملاء (خط ساخن أو موبايل).",
  ),
  whatsapp: requiredText("اكتب رقم واتساب صحيح (موبايل 11 رقم).", 40).refine(
    (v) => v.replace(/\D/g, "").length >= 10,
    "اكتب رقم واتساب صحيح (موبايل 11 رقم).",
  ),
});

const isImageUrl = (u: string) =>
  u.startsWith("data:image/") || u.startsWith("/") || u.startsWith("https://");

export const homeInputSchema = z.object({
  title: requiredText("العنوان مطلوب.", 120),
  subtitle: optionalText(300).transform((v) => v ?? ""),
  heroImages: z.array(z.string()).transform((list) => list.filter(isImageUrl).slice(0, 8)),
  /** empty = keep the current line */
  trust: z.array(optionalText(80)).length(3),
  steps: z.array(optionalText(80)).length(4),
});

export function homeFormValues(fd: FormData) {
  return {
    title: fd.get("title"),
    subtitle: fd.get("subtitle"),
    heroImages: fd.getAll("heroImages").map(String),
    trust: [0, 1, 2].map((i) => fd.get(`trust${i}`)),
    steps: [0, 1, 2, 3].map((i) => fd.get(`step${i}`)),
  };
}

const cargoRowSchema = z.object({
  label: optionalText(60),
  size: optionalText(4).transform((v) => v ?? ""),
  icon: optionalText(10).transform((v): CargoIcon =>
    v && (CARGO_ICONS as readonly string[]).includes(v) ? (v as CargoIcon) : "box",
  ),
});

export const orderContentInputSchema = z.object({
  loaderFee: egpAmount("أجر العامل لازم يكون رقم."),
  maxLoaders: requiredNumber("أقصى عدد عمالة من 0 لـ 10.", { min: 0, max: 10, int: true }),
  disclaimer: optionalText(1000).transform((v) => v ?? ""),
  cargo: z
    .array(cargoRowSchema)
    .transform((rows) =>
      rows.flatMap((r) => (r.label ? [{ label: r.label, size: r.size, icon: r.icon }] : [])),
    )
    .refine((rows) => rows.length > 0, "لازم اختيار واحد على الأقل في «ماذا ستنقل؟»."),
});

export function orderContentFormValues(fd: FormData) {
  return {
    loaderFee: fd.get("loaderFee"),
    maxLoaders: fd.get("maxLoaders"),
    disclaimer: fd.get("disclaimer"),
    cargo: Array.from({ length: 6 }, (_, i) => ({
      label: fd.get(`cargoLabel${i}`),
      size: fd.get(`cargoSize${i}`),
      icon: fd.get(`cargoIcon${i}`),
    })),
  };
}

export const faqInputSchema = z.object({
  id: optionalText(40),
  q: requiredText("السؤال والإجابة مطلوبين.", 300),
  a: requiredText("السؤال والإجابة مطلوبين.", 3000),
  topic: choice(FAQ_TOPIC_IDS, "اختار موضوع."),
});

export const faqRefSchema = z.object({ id: requiredText("السؤال مش موجود.", 40) });

export const faqMoveSchema = faqRefSchema.extend({
  dir: optionalText(4).transform((v) => (v === "up" ? "up" : "down")),
});
