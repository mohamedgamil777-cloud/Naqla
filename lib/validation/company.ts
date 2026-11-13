/** B2B companies: admin company records, members, account payments, and the customer company page. */
import { z } from "zod";
import { selectCompanyMemberSchema, selectCompanyPaymentSchema, selectCompanySchema } from "@/db/schema";
import { isValidEgyptianMobile, toE164 } from "@/lib/phone";
import {
  checkbox,
  egpAmount,
  egyptianMobile,
  id,
  optionalId,
  optionalNumber,
  optionalText,
  positiveEgpAmount,
  requiredText,
} from "./fields";

export const companyInputSchema = z.object({
  id: optionalId(),
  name: requiredText("اكتب اسم الشركة.", 160),
  /** a company landline is allowed too; mobiles are normalized to E.164 */
  phone: optionalText(40).transform((v) => (v && isValidEgyptianMobile(v) ? toE164(v) : v)),
  taxNumber: optionalText(40),
  address: optionalText(300),
  discountPct: optionalNumber("الخصم من 0 لـ 100%.", { min: 0, max: 100 }).transform((v) =>
    Math.round(v ?? 0),
  ),
  billing: optionalText(10)
    .pipe(selectCompanySchema.shape.billing.nullable().catch("cash"))
    .transform((v) => v ?? "cash"),
  creditLimit: egpAmount("الحد الائتماني مش صحيح."),
  active: checkbox(),
});

export const companyMemberInputSchema = z.object({
  companyId: id("الشركة مش موجودة."),
  phone: egyptianMobile("رقم موبايل مش صحيح (01xxxxxxxxx)."),
  name: optionalText(120),
  /** optional for staff: the company admin can set them later */
  username: optionalText(40),
  password: optionalText(128),
  role: optionalText(10)
    .pipe(selectCompanyMemberSchema.shape.role.nullable().catch("member"))
    .transform((v) => v ?? "member"),
});

export const companyChildRefSchema = z.object({ companyId: id("الشركة مش موجودة."), id: id("مش موجود.") });

export const companyPaymentInputSchema = z.object({
  companyId: id("الشركة مش موجودة."),
  amount: positiveEgpAmount("اكتب المبلغ."),
  method: optionalText(10)
    .pipe(selectCompanyPaymentSchema.shape.method.nullable().catch("bank"))
    .transform((v) => v ?? "bank"),
  note: optionalText(500),
});

/** شركتي: the company admin adds a colleague (always as a member) with a username + password. */
export const companyUserInputSchema = z.object({
  phone: egyptianMobile("رقم موبايل مش صحيح (01xxxxxxxxx)."),
  name: optionalText(120),
  username: requiredText("اكتب اسم المستخدم.", 40),
  // empty for someone who already has an انقلي password (they keep it)
  password: optionalText(128),
});

/** Set or change a company user's username (and optionally a new password). */
export const companyUserLoginSchema = z.object({
  companyId: optionalId(),
  id: optionalId(),
  username: requiredText("اكتب اسم المستخدم.", 40),
  password: optionalText(128),
});

export const savedAddressRefSchema = z.object({ id: id("العنوان مش موجود.") });

/** حسابي / شركتي: add (no id) or edit (id) one saved address. */
export const savedAddressInputSchema = z.object({
  id: optionalId(),
  label: requiredText("اكتب اسم للعنوان (مثلاً: البيت، المخزن).", 40),
  address: requiredText("اكتب العنوان.", 300).refine((v) => v.length >= 3, "اكتب العنوان."),
  details: optionalText(300),
  lat: optionalNumber("المكان على الخريطة مش صحيح.", { min: -90, max: 90 }),
  lng: optionalNumber("المكان على الخريطة مش صحيح.", { min: -180, max: 180 }),
  isDefault: checkbox(),
});

/** «للشركات»: a business asks for a company account. */
export const companyRequestInputSchema = z.object({
  companyName: requiredText("اكتب اسم الشركة أو المحل.", 160),
  contactName: requiredText("اكتب اسم المسؤول.", 120),
  phone: egyptianMobile("رقم موبايل مش صحيح (01xxxxxxxxx)."),
  monthlyTrips: optionalText(40),
  note: optionalText(1000),
});
