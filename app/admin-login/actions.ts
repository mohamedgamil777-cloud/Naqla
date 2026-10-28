"use server";
import { redirect } from "next/navigation";
import { checkPasscode, setAdminSession, clearAdminSession } from "@/services/admin-auth";
import { adminPasscode } from "@/lib/env";

export interface LoginState {
  error?: string;
}

export async function adminLogin(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const code = String(fd.get("passcode") ?? "").trim();
  if (!code) return { error: "اكتب كلمة السر." };
  if (!adminPasscode()) return { error: "الدخول بكلمة السر مقفول لحد ما تتضبط كلمة سر قوية للإدارة على السيرفر (ADMIN_PASSCODE)." };
  if (!checkPasscode(code)) return { error: "كلمة السر غلط." };
  await setAdminSession();
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  await clearAdminSession();
  redirect("/admin-login");
}
