/**
 * Admin identity: who is signed in to the admin and with which role.
 * Entry is the shared passcode (→ super_admin) or a staff phone session with an admin role.
 * What each role may DO is decided by lib/permissions.ts and enforced by lib/authz.ts.
 */
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getSession } from "./session";
import { repo } from "@/db/repo";
import type { StaffRole } from "@/types";
import { isAdminRole } from "@/lib/permissions";

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
  const token = await new SignJWT({ admin: true, role: "super_admin" })
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

/** Resolve the current admin role, or null if not an admin.
 *  1) the shared passcode cookie → super_admin (the owner).
 *  2) a staff member logged in via phone OTP whose role is an admin role. */
export async function getAdminRole(): Promise<StaffRole | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      const role = typeof payload.role === "string" ? payload.role : null;
      if (payload.admin === true && isAdminRole(role)) return role;
    } catch {
      /* fall through */
    }
  }
  const session = await getSession();
  if (session) {
    const staff = await repo.getStaffByPhone(session.phone);
    if (staff && isAdminRole(staff.role)) return staff.role;
  }
  return null;
}

/** Who is acting in the admin, for records like "taken by" / "received by". */
export async function getAdminName(): Promise<string> {
  const session = await getSession();
  const staff = session ? await repo.getStaffByPhone(session.phone) : null;
  return staff && isAdminRole(staff.role) ? staff.name : "المدير";
}

export async function isAdminAuthed(): Promise<boolean> {
  return (await getAdminRole()) !== null;
}
