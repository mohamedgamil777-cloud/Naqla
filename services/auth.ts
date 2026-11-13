/**
 * Phone + password login for every user (customers, drivers, staff).
 * OTP is switched off for now; the otp_codes table, repo functions and services/sms.ts stay so it can
 * return later as a second factor or a one-time login code.
 *
 * Rules:
 *  - 5 wrong passwords lock the account for 15 minutes (counted atomically in the database)
 *  - unknown phone and wrong password look the same to the caller and take the same time
 *  - a customer who has no password yet (accounts from the OTP era) creates one by registering;
 *    the number then shows as unverified until an agent confirms it by phone
 *  - drivers and staff get their password from an admin (or the bootstrap admin from env)
 */
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import {
  bumpOtpAttempt,
  claimAccount,
  clearLoginFailures,
  consumeOtp,
  countOtpsSince,
  createUserWithPassword,
  getLoginAccount,
  getLoginAccountByUsername,
  latestOtp,
  recordLoginFailure,
  saveOtp,
  setPassword,
} from "@/db/lib/accounts";
import { authSecret } from "@/lib/env";
import { normalizeUsername, USERNAME_RE } from "@/lib/username";
import { getSms } from "@/services/sms";
import type { LoginAccount } from "@/types";
import { toE164 } from "@/lib/phone";
import { dummyHash, hashPassword, verifyPassword } from "@/lib/password";
import { passwordProblem } from "@/lib/password-policy";

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MS = 15 * 60 * 1000;

export class AuthError extends Error {
  constructor(
    public code:
      | "INVALID_PHONE"
      | "INVALID_CREDENTIALS"
      | "ACCOUNT_LOCKED"
      | "PASSWORD_NOT_SET"
      | "PHONE_TAKEN"
      | "STAFF_ACCOUNT"
      | "WEAK_PASSWORD"
      | "INVALID_NAME"
      | "OTP_DISABLED"
      | "INVALID_CODE"
      | "TOO_MANY_CODES",
    public detail?: string,
  ) {
    super(code);
  }
}

export function normalizePhone(raw: string): string {
  try {
    return toE164(raw);
  } catch {
    throw new AuthError("INVALID_PHONE");
  }
}

export interface AuthResult {
  phone: string;
  name: string | null;
  role: string;
}

/** "ahmed.nour" → that username; anything else is read as a phone number. */
export function isUsername(login: string): boolean {
  return USERNAME_RE.test(normalizeUsername(login));
}

/** The account for a phone number or a username (null when none). */
async function findAccount(login: string): Promise<LoginAccount | null> {
  if (isUsername(login)) return getLoginAccountByUsername(normalizeUsername(login));
  return getLoginAccount(normalizePhone(login));
}

/** Phone number or username + password. */
export async function loginWithPassword(login: string, password: string): Promise<AuthResult> {
  const acct = await findAccount(login);
  if (!acct) {
    await verifyPassword(password, await dummyHash()); // same cost as a real check
    throw new AuthError("INVALID_CREDENTIALS");
  }
  if (acct.lockedUntil && acct.lockedUntil.getTime() > Date.now()) {
    throw new AuthError("ACCOUNT_LOCKED", minutesLeft(acct.lockedUntil));
  }
  if (!acct.passwordHash) {
    await verifyPassword(password, await dummyHash());
    throw new AuthError("PASSWORD_NOT_SET", acct.role === "customer" ? "customer" : "staff");
  }
  if (!(await verifyPassword(password, acct.passwordHash))) {
    const { lockedUntil } = await recordLoginFailure(acct.id, MAX_FAILED_LOGINS, LOCK_MS);
    if (lockedUntil && lockedUntil.getTime() > Date.now())
      throw new AuthError("ACCOUNT_LOCKED", minutesLeft(lockedUntil));
    throw new AuthError("INVALID_CREDENTIALS");
  }
  if (acct.failedLoginCount > 0 || acct.lockedUntil) await clearLoginFailures(acct.id);
  return { phone: acct.phone, name: acct.name, role: acct.role };
}

/** Customer self-registration, or first password for a customer account that has none yet. */
export async function registerCustomer(
  rawPhone: string,
  rawName: string,
  password: string,
): Promise<AuthResult> {
  const phone = normalizePhone(rawPhone);
  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) throw new AuthError("INVALID_NAME");
  const problem = passwordProblem(password, "customer");
  if (problem) throw new AuthError("WEAK_PASSWORD", problem);

  const existing = await getLoginAccount(phone);
  if (existing) {
    if (existing.role !== "customer") throw new AuthError("STAFF_ACCOUNT");
    if (existing.passwordHash) throw new AuthError("PHONE_TAKEN");
    // claimed atomically: only while the account still has no password
    if (!(await claimAccount(existing.id, await hashPassword(password), name)))
      throw new AuthError("PHONE_TAKEN");
    return { phone, name, role: "customer" };
  }
  const res = await createUserWithPassword({
    phone,
    name,
    role: "customer",
    passwordHash: await hashPassword(password),
    verified: false,
  });
  if (!res.created) throw new AuthError("PHONE_TAKEN"); // lost a race for the same number
  return { phone, name, role: "customer" };
}

/** Admin sets a password for any account (staff manager / customers page / bootstrap). */
export async function adminSetPassword(
  userId: string,
  role: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const problem = passwordProblem(password, role);
  if (problem) return { ok: false, error: problem };
  const done = await setPassword(userId, await hashPassword(password));
  return done ? { ok: true } : { ok: false, error: "الحساب مش موجود." };
}

// ---------- forgot password: a code by SMS to the account's phone ----------

export const RESET_CODE_TTL_MS = 10 * 60 * 1000;
export const RESET_MAX_ATTEMPTS = 5;
/** at most this many codes per phone per hour */
export const RESET_CODES_PER_HOUR = 3;
/** staff passwords are reset by a super admin, never by SMS */
const SELF_RESET_ROLES = new Set(["customer", "driver"]);

function codeHash(phone: string, code: string): string {
  return createHmac("sha256", authSecret()).update(`${phone}:${code}`).digest("hex");
}

/** Last two digits only — enough for the person to recognise their number. */
export function maskPhone(phone: string): string {
  return `•••••••${phone.slice(-2)}`;
}

/**
 * Sends a 6-digit code to the account's phone. Unknown accounts get the same answer (no
 * account discovery); the masked number is shown only for a username the person typed.
 */
export async function requestPasswordReset(login: string): Promise<{ sentTo: string | null }> {
  const acct = await findAccount(login);
  if (!acct || !SELF_RESET_ROLES.has(acct.role)) return { sentTo: null };
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if ((await countOtpsSince(acct.phone, hourAgo)) >= RESET_CODES_PER_HOUR) throw new AuthError("TOO_MANY_CODES");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await saveOtp(acct.phone, codeHash(acct.phone, code), new Date(Date.now() + RESET_CODE_TTL_MS));
  await getSms().send(acct.phone, `كود انقلي لتغيير كلمة السر: ${code}\nصالح 10 دقايق. ماتديهوش لحد.`);
  return { sentTo: isUsername(login) ? maskPhone(acct.phone) : null };
}

/** Checks the code, sets the new password (unlocking the account) and signs the person in. */
export async function resetPasswordWithCode(login: string, code: string, password: string): Promise<AuthResult> {
  const acct = await findAccount(login);
  const otp = acct && SELF_RESET_ROLES.has(acct.role) ? await latestOtp(acct.phone) : null;
  if (!acct || !otp || otp.expiresAt.getTime() < Date.now() || otp.attempts >= RESET_MAX_ATTEMPTS)
    throw new AuthError("INVALID_CODE");
  const expected = Buffer.from(otp.codeHash, "hex");
  const given = Buffer.from(codeHash(acct.phone, code.trim()), "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    await bumpOtpAttempt(acct.phone);
    throw new AuthError("INVALID_CODE");
  }
  const problem = passwordProblem(password, acct.role);
  if (problem) throw new AuthError("WEAK_PASSWORD", problem);
  await consumeOtp(acct.phone);
  await setPassword(acct.id, await hashPassword(password));
  return { phone: acct.phone, name: acct.name, role: acct.role };
}

function minutesLeft(until: Date): string {
  return String(Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000)));
}
