"use server";
/** Staff sign-in for the admin (phone + password), the emergency passcode, and sign-out. */
import { redirect } from "next/navigation";
import { checkPasscode, setAdminSession, clearAdminSession } from "@/services/admin-auth";
import { adminPasscode } from "@/lib/env";
import { AuthError, loginWithPassword } from "@/services/auth";
import { setSession, clearSession } from "@/services/session";
import { isAdminRole } from "@/lib/permissions";
import { runBootstrapAdmin } from "@/services/bootstrap";
import { audit } from "@/services/audit";
import { insertAuditLog } from "@/db/lib/audit";
import { getStaffByPhone } from "@/db/lib/staff";
import { actionFailure, fail, invalid, type ActionResult } from "@/lib/action-result";
import { formObject } from "@/lib/validation/fields";
import { loginInputSchema, passcodeInputSchema } from "@/lib/validation/staff";

export type LoginState = ActionResult;

const AUTH_MESSAGES: Partial<Record<AuthError["code"], string>> = {
  INVALID_PHONE: "اكتب رقم موبايل مصري صحيح (01xxxxxxxxx).",
  INVALID_CREDENTIALS: "الرقم أو كلمة السر غلط.",
  PASSWORD_NOT_SET: "الحساب ده لسه ملوش كلمة سر — اطلبها من المدير العام.",
};

/** سجل النشاط: the new cookie is not readable in this request yet, so the actor is written directly. */
async function logLogin(phone: string | null, name: string, label: string | null = null): Promise<void> {
  try {
    await insertAuditLog({
      actorId: phone ? ((await getStaffByPhone(phone))?.id ?? null) : null,
      action: "admin.login",
      entity: "admin",
      entityId: null,
      before: null,
      after: { _label: label, _by: name },
    });
  } catch (error) {
    console.error("[audit] login", error);
  }
}

/** Staff sign-in: phone + password, admin roles only. */
export async function staffLogin(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = loginInputSchema.safeParse({ phone: fd.get("phone"), password: fd.get("password") ?? "" });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await runBootstrapAdmin(); // the SEED_ADMIN_* super-admin always exists before anyone signs in
    const user = await loginWithPassword(parsed.data.phone, parsed.data.password);
    if (!isAdminRole(user.role)) return fail("الحساب ده مش له صلاحية دخول الإدارة.");
    await setSession({ phone: user.phone, name: user.name ?? undefined });
    await logLogin(user.phone, user.name || user.phone);
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.code === "ACCOUNT_LOCKED")
        return fail(`محاولات غلط كتير — جرّب تاني بعد ${error.detail ?? 15} دقيقة.`);
      return fail(AUTH_MESSAGES[error.code] ?? "مش قادرين ندخلك دلوقتي.");
    }
    return actionFailure("staffLogin", error, "مش قادرين ندخلك دلوقتي.");
  }
  redirect("/admin");
}

/** Emergency access with the shared ADMIN_PASSCODE (refused when it's missing/weak in production). */
export async function adminLogin(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = passcodeInputSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  if (!adminPasscode()) {
    return fail("الدخول بكلمة سر الإدارة مقفول لحد ما تتضبط كلمة سر قوية على السيرفر (ADMIN_PASSCODE).");
  }
  if (!checkPasscode(parsed.data.passcode)) return fail("كلمة السر غلط.");
  await setAdminSession();
  await logLogin(null, "المدير", "بكلمة سر الإدارة");
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  await audit({ action: "admin.logout", entity: "admin" });
  await clearAdminSession();
  await clearSession(); // staff signed in with phone + password
  redirect("/admin-login");
}
