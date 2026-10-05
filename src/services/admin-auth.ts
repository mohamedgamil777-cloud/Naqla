/**
 * Minimal admin gate: a single shared passcode protects the whole /admin area.
 * This is a lightweight guard (not full per-user RBAC) so the panel isn't open
 * to anyone with the link. Set ADMIN_PASSCODE in production; a dev default keeps
 * local use frictionless.
 */
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getSession } from "./session";
import { repo } from "@/data/repo";
import type { StaffRole } from "@/data/types";

const COOKIE = "naqla_admin";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me-please-32b"
);

/** Staff roles that may enter the admin area at all. */
export const ADMIN_ROLES: StaffRole[] = ["super_admin", "fleet_mgr", "agent", "finance"];

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
      if (payload.admin === true) return ((payload.role as StaffRole) ?? "super_admin");
    } catch {
      /* fall through */
    }
  }
  const session = await getSession();
  if (session) {
    const staff = await repo.getStaffByPhone(session.phone);
    if (staff && ADMIN_ROLES.includes(staff.role)) return staff.role;
  }
  return null;
}

export async function isAdminAuthed(): Promise<boolean> {
  return (await getAdminRole()) !== null;
}

/** Guard a page to specific admin roles. Redirects away if not allowed. */
export async function requireAdminRole(allowed: StaffRole[]): Promise<StaffRole> {
  const { redirect } = await import("next/navigation");
  const role = await getAdminRole();
  if (!role) redirect("/admin-login");
  if (!allowed.includes(role!)) redirect("/admin");
  return role!;
}
