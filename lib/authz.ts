/**
 * Server-side authorization for the admin. Who the actor is comes ONLY from server state
 * (signed admin cookie or the staff record behind the session phone) — never from the client.
 * - requirePermission(): pages and server actions (redirects to login / back to the dashboard)
 * - authorizeRequest():  route handlers (401 not signed in, 403 signed in without access — incl. customers)
 */
import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getAdminRole } from "@/services/admin-auth";
import { getSession } from "@/services/session";
import { can, isAdminRole, type AdminRole, type Permission } from "@/lib/permissions";

export interface StaffActor {
  role: AdminRole;
}

export async function getStaffActor(): Promise<StaffActor | null> {
  const role = await getAdminRole();
  return isAdminRole(role) ? { role } : null;
}

/** Pages + server actions: not signed in → /admin-login; signed in without access → dashboard notice. */
export async function requirePermission(permission: Permission): Promise<StaffActor> {
  const actor = await getStaffActor();
  if (!actor) redirect("/admin-login");
  if (!can(actor.role, permission)) redirect(`/admin?denied=${encodeURIComponent(permission)}`);
  return actor;
}

export type RequestAuth = { ok: true; actor: StaffActor } | { ok: false; response: NextResponse };

/** Route handlers: consistent 401 / 403 JSON errors. */
export async function authorizeRequest(permission: Permission): Promise<RequestAuth> {
  const actor = await getStaffActor();
  if (!actor) {
    // signed in as a customer/driver = known identity without admin access → 403, not 401
    const status = (await getSession()) ? 403 : 401;
    return {
      ok: false,
      response: NextResponse.json({ error: status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN" }, { status }),
    };
  }
  if (!can(actor.role, permission))
    return { ok: false, response: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) };
  return { ok: true, actor };
}

/** Customer-owned records (by phone): the owner, or staff holding booking:read. */
export async function canViewBooking(ownerPhone: string | null): Promise<boolean> {
  const session = await getSession();
  if (session && ownerPhone && session.phone === ownerPhone) return true;
  const actor = await getStaffActor();
  return !!actor && can(actor.role, "booking:read");
}
