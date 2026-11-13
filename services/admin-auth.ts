/**
 * Admin identity: who is signed in to the admin and with which role.
 * Entry is the shared passcode (→ super_admin) or a staff phone session with an admin role.
 * What each role may DO is decided by lib/permissions.ts and enforced by lib/authz.ts.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { adminPasscode, authSecret } from "@/lib/env";
import { getSession } from "./session";
import { getStaffByPhone } from "@/db/lib/staff";
import type { StaffRole } from "@/types";
import { isAdminRole } from "@/lib/permissions";

const COOKIE = "naqla_admin";
const key = () => new TextEncoder().encode(authSecret());

/** Passcode login to the admin. Refused when the passcode is missing/weak in production (lib/env). */
export function checkPasscode(input: string): boolean {
  const expected = adminPasscode();
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setAdminSession(): Promise<void> {
  const token = await new SignJWT({ admin: true, role: "super_admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key());
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
      const { payload } = await jwtVerify(token, key());
      const role = typeof payload.role === "string" ? payload.role : null;
      if (payload.admin === true && isAdminRole(role)) return role;
    } catch {
      /* fall through */
    }
  }
  const staff = await sessionStaff();
  return staff && isAdminRole(staff.role) ? staff.role : null;
}

/** The staff record behind the phone session (looked up once per request). */
const sessionStaff = cache(async () => {
  const session = await getSession();
  return session ? await getStaffByPhone(session.phone) : null;
});

/** Who is acting in the admin, for records like "taken by" / "received by". */
export async function getAdminName(): Promise<string> {
  return (await getAdminActor()).name;
}

/** The signed-in staff member, or the owner when they came in with the shared passcode (no record). */
export async function getAdminActor(): Promise<{ id: string | null; name: string }> {
  const staff = await sessionStaff();
  return staff && isAdminRole(staff.role) ? { id: staff.id, name: staff.name || staff.phone } : { id: null, name: "المدير" };
}

export async function isAdminAuthed(): Promise<boolean> {
  return (await getAdminRole()) !== null;
}
