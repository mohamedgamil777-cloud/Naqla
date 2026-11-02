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
import {
  claimAccount,
  clearLoginFailures,
  createUserWithPassword,
  getLoginAccount,
  recordLoginFailure,
  setPassword,
} from "@/db/lib/accounts";
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
      | "OTP_DISABLED",
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

export async function loginWithPassword(rawPhone: string, password: string): Promise<AuthResult> {
  const phone = normalizePhone(rawPhone);
  const acct = await getLoginAccount(phone);
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
  return { phone, name: acct.name, role: acct.role };
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

function minutesLeft(until: Date): string {
  return String(Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000)));
}
