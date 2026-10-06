/** OTP auth: send a code, verify it, upsert the user. Provider-agnostic SMS. */
import { createHmac, randomInt } from "node:crypto";
import { repo } from "@/data/repo";
import { getSms } from "./sms";
import { toE164 } from "@/lib/phone";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;
/** Staff who can enter admin by phone. They must NEVER get an on-screen demo code. */
const ADMIN_STAFF_ROLES = ["super_admin", "fleet_mgr", "agent", "finance"];
const secret = process.env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me-please-32b";

function hashCode(phone: string, code: string): string {
  return createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
}

export class AuthError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

/** True only when no real SMS gateway is configured (dev/demo). */
export function isDevSms(): boolean {
  return (process.env.SMS_PROVIDER ?? "console") === "console";
}

/**
 * Send an OTP to an Egyptian mobile. Returns the E.164 phone. In demo mode
 * (console SMS provider only) it also returns the code so the UI can show it —
 * this NEVER happens once a real SMS provider is configured.
 */
export async function sendOtp(rawPhone: string): Promise<{ phone: string; devCode?: string; staffUsePasscode?: boolean }> {
  let phone: string;
  try {
    phone = toE164(rawPhone);
  } catch {
    throw new AuthError("INVALID_PHONE");
  }
  // Slow down code guessing / SMS abuse: one new code per number every 30s.
  const last = await repo.latestOtp(phone);
  if (last && Date.now() - new Date(last.createdAt).getTime() < RESEND_COOLDOWN_MS) {
    throw new AuthError("TOO_SOON");
  }
  const code = String(randomInt(1000, 10000)); // 4-digit
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await repo.saveOtp(phone, hashCode(phone, code), expiresAt);
  await getSms().send(phone, `كود الدخول لـ نقلة: ${code}`);
  // Demo mode shows the code on screen — but never for admin staff numbers, or anyone
  // could open the admin dashboard by typing a staff phone. Staff use the passcode
  // until a real SMS provider is connected.
  if (isDevSms()) {
    const staff = await repo.getStaffByPhone(phone);
    if (staff && ADMIN_STAFF_ROLES.includes(staff.role)) return { phone, staffUsePasscode: true };
    return { phone, devCode: code };
  }
  return { phone };
}

/** Verify an OTP. On success, upserts the user and returns the phone. */
export async function verifyOtp(rawPhone: string, code: string): Promise<{ phone: string }> {
  let phone: string;
  try {
    phone = toE164(rawPhone);
  } catch {
    throw new AuthError("INVALID_PHONE");
  }
  const rec = await repo.latestOtp(phone);
  if (!rec) throw new AuthError("NO_CODE");
  if (rec.consumed) throw new AuthError("NO_CODE");
  if (new Date() > rec.expiresAt) throw new AuthError("EXPIRED");
  if (rec.attempts >= MAX_ATTEMPTS) throw new AuthError("TOO_MANY_ATTEMPTS");

  if (rec.codeHash !== hashCode(phone, code.trim())) {
    await repo.bumpOtpAttempt(phone);
    throw new AuthError("WRONG_CODE");
  }
  await repo.consumeOtp(phone);
  await repo.upsertUser(phone);
  return { phone };
}
