"use server";
import { redirect } from "next/navigation";
import { checkPasscode, setAdminSession, clearAdminSession } from "@/services/admin-auth";
import { adminPasscode, EnvError } from "@/lib/env";
import { AuthError, loginWithPassword } from "@/services/auth";
import { setSession, clearSession } from "@/services/session";
import { isAdminRole } from "@/lib/permissions";
import { bootstrapAdminOnce } from "@/services/bootstrap";

export interface LoginState {
  error?: string;
}

const AUTH_MESSAGES: Partial<Record<AuthError["code"], string>> = {
  INVALID_PHONE: "اكتب رقم موبايل مصري صحيح (01xxxxxxxxx).",
  INVALID_CREDENTIALS: "الرقم أو كلمة السر غلط.",
  PASSWORD_NOT_SET: "الحساب ده لسه ملوش كلمة سر — اطلبها من المدير العام.",
};

const SIGN_IN_OFF = "تسجيل الدخول مقفول لحد ما يتضبط AUTH_SECRET على السيرفر (32 حرف على الأقل).";

/** Staff sign-in: phone + password, admin roles only. */
export async function staffLogin(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const phone = String(fd.get("phone") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!phone || !password) return { error: "اكتب رقم الموبايل وكلمة السر." };
  await bootstrapAdminOnce(); // the SEED_ADMIN_* super-admin always exists before anyone signs in
  try {
    const user = await loginWithPassword(phone, password);
    if (!isAdminRole(user.role)) return { error: "الحساب ده مش له صلاحية دخول الإدارة." };
    await setSession({ phone: user.phone, name: user.name ?? undefined });
  } catch (e) {
    if (e instanceof EnvError) return { error: SIGN_IN_OFF };
    if (!(e instanceof AuthError)) throw e;
    if (e.code === "ACCOUNT_LOCKED") return { error: `محاولات غلط كتير — جرّب تاني بعد ${e.detail ?? 15} دقيقة.` };
    return { error: AUTH_MESSAGES[e.code] ?? "مش قادرين ندخلك دلوقتي." };
  }
  redirect("/admin");
}

/** Emergency access with the shared ADMIN_PASSCODE (refused when it's missing/weak in production). */
export async function adminLogin(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const code = String(fd.get("passcode") ?? "").trim();
  if (!code) return { error: "اكتب كلمة السر." };
  if (!adminPasscode()) return { error: "الدخول بكلمة سر الإدارة مقفول لحد ما تتضبط كلمة سر قوية على السيرفر (ADMIN_PASSCODE)." };
  if (!checkPasscode(code)) return { error: "كلمة السر غلط." };
  try {
    await setAdminSession();
  } catch (e) {
    if (e instanceof EnvError) return { error: SIGN_IN_OFF };
    throw e;
  }
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  await clearAdminSession();
  await clearSession(); // staff signed in with phone + password
  redirect("/admin-login");
}
