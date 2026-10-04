/**
 * Minimal admin gate: a single shared passcode protects the whole /admin area.
 * This is a lightweight guard (not full per-user RBAC) so the panel isn't open
 * to anyone with the link. Set ADMIN_PASSCODE in production; a dev default keeps
 * local use frictionless.
 */
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "naqla_admin";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me-please-32b"
);

/** The passcode required to enter the admin panel. */
export function adminPasscode(): string {
  return process.env.ADMIN_PASSCODE ?? "naqla2026";
}

export function checkPasscode(input: string): boolean {
  const expected = adminPasscode();
  // Constant-ish comparison; inputs are short so this is fine.
  if (input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function setAdminSession(): Promise<void> {
  const token = await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAdminAuthed(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.admin === true;
  } catch {
    return false;
  }
}
