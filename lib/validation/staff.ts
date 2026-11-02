/** Staff and accounts managed in admin. */
import { z } from "zod";
import { selectUserSchema } from "@/db/schema";
import { choice, egyptianMobile, id, optionalId, optionalText, requiredText } from "./fields";

/** Every role except "customer". */
export const STAFF_ROLES = [
  "super_admin",
  "fleet_mgr",
  "agent",
  "driver",
  "finance",
] as const satisfies readonly z.infer<typeof selectUserSchema>["role"][];

export const staffInputSchema = z
  .object({
    id: optionalId(),
    name: requiredText("اكتب اسم الموظف.", 120),
    phone: egyptianMobile("رقم الموبايل مش صحيح."),
    role: choice(STAFF_ROLES, "اختار الوظيفة."),
    nationalId: optionalText(40),
    photo: optionalText(3_000_000),
    drivingLicense: optionalText(3_000_000),
    vehicleLicense: optionalText(3_000_000),
  })
  // licence images belong to drivers only
  .transform((s) => (s.role === "driver" ? s : { ...s, drivingLicense: null, vehicleLicense: null }));

export const staffRoleInputSchema = z.object({
  id: id("الموظف مش موجود."),
  role: choice(STAFF_ROLES, "اختار الوظيفة."),
});

export const accountPasswordInputSchema = z.object({
  id: id("الحساب مش موجود."),
  password: z.string().min(1, "اكتب كلمة السر الجديدة.").max(128, "كلمة السر طويلة جدًا."),
});

export const accountRefSchema = z.object({ id: id("الحساب مش موجود.") });

export const loginInputSchema = z.object({
  phone: requiredText("اكتب رقم الموبايل وكلمة السر.", 40),
  password: z.string().min(1, "اكتب رقم الموبايل وكلمة السر.").max(128),
});

export const passcodeInputSchema = z.object({ passcode: requiredText("اكتب كلمة السر.", 128) });
