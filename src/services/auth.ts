/** OTP auth: send a code, verify it, upsert the user. Provider-agnostic SMS. */
import { createHmac, randomInt } from "node:crypto";
import { repo } from "@/data/repo";
import { getSms } from "./sms";
import { toE164 } from "@/lib/phone";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
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
export async function sendOtp(rawPhone: string): Promise<{ phone: string; devCode?: string }> {
  let phone: string;
  try {
    phone = toE164(rawPhone);
  } catch {
    throw new AuthError("INVALID_PHONE");
  }
  const code = String(randomInt(1000, 10000)); // 4-digit
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await repo.saveOtp(phone, hashCode(phone, code), expiresAt);
  await getSms().send(phone, `كود الدخول لـ نقلة: ${code}`);
  return { phone, devCode: isDevSms() ? code : undefined };
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
