/** Password rules — pure, shared by server validation and the login/registration forms. */
import { isAdminRole } from "@/lib/permissions";

export const MIN_PASSWORD = 6; // customers + drivers
export const MIN_STAFF_PASSWORD = 8; // admin roles
export const MAX_PASSWORD = 128;

export function minPasswordFor(role: string | null | undefined): number {
  return isAdminRole(role) ? MIN_STAFF_PASSWORD : MIN_PASSWORD;
}

/** null when acceptable, else an Arabic message. */
export function passwordProblem(password: string, role?: string | null): string | null {
  const min = minPasswordFor(role);
  if (password.length < min) return `كلمة السر لازم تكون ${min} حروف أو أرقام على الأقل.`;
  if (password.length > MAX_PASSWORD) return "كلمة السر طويلة أوي.";
  if (/^(.)\1+$/.test(password)) return "اختار كلمة سر أصعب من كده (مش نفس الحرف متكرر).";
  if (["123456", "1234567", "12345678", "123456789", "password", "000000", "111111"].includes(password.toLowerCase())) {
    return "كلمة السر دي سهلة أوي، اختار حاجة تانية.";
  }
  return null;
}
