/** HTTP shape of auth results, shared by the website routes and the mobile /api/v1 aliases. */
import { NextResponse } from "next/server";
import { AuthError, type AuthResult } from "@/services/auth";
import { setSession } from "@/services/session";
import { EnvError } from "@/lib/env";

const STATUS: Record<AuthError["code"], number> = {
  INVALID_PHONE: 400,
  WEAK_PASSWORD: 400,
  INVALID_NAME: 400,
  INVALID_CREDENTIALS: 401,
  PASSWORD_NOT_SET: 403,
  STAFF_ACCOUNT: 403,
  PHONE_TAKEN: 409,
  OTP_DISABLED: 410,
  ACCOUNT_LOCKED: 429,
};

/** Signs the user in (website cookie) and returns the same token for the mobile app's Bearer header. */
export async function signedIn(r: AuthResult) {
  const token = await setSession({ phone: r.phone, name: r.name ?? undefined });
  return NextResponse.json({ ok: true, phone: r.phone, name: r.name, role: r.role, token });
}

export function authFailure(e: unknown) {
  // Server misconfigured (AUTH_SECRET missing/weak): a clear 503, not a crash.
  if (e instanceof EnvError) return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
  if (!(e instanceof AuthError)) throw e;
  const body: Record<string, string> = { error: e.code };
  if (e.code === "ACCOUNT_LOCKED" && e.detail) body.retryAfterMinutes = e.detail;
  if (e.code === "WEAK_PASSWORD" && e.detail) body.message = e.detail;
  if (e.code === "PASSWORD_NOT_SET" && e.detail) body.account = e.detail; // "customer" | "staff"
  return NextResponse.json(body, { status: STATUS[e.code] });
}

export const badRequest = () => NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
