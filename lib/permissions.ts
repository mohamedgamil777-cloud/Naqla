/**
 * Permission registry: the single source of truth for what each staff role may do in the admin.
 * Pure data + `can()` (safe in client components for hiding UI); the server helpers that ENFORCE
 * these live in lib/authz.ts. Hiding a button is feedback only — every page, action and route
 * checks its permission on the server.
 */
import type { StaffRole } from "@/types";

/** Staff roles that can enter the admin area (drivers use the driver app instead). */
export const ADMIN_ROLES = [
  "super_admin",
  "fleet_mgr",
  "agent",
  "finance",
] as const satisfies readonly StaffRole[];
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const PERMISSIONS = [
  "dashboard:read",
  "delivery:read", // delivery orders list
  "delivery:create", // phone orders taken by staff
  "delivery:update", // status, assigned driver, car size
  "delivery:cash", // driver fee + cash handed in per order
  "booking:read", // rental bookings + schedule board
  "booking:create", // agent creates a rental booking
  "booking:update", // status, extension, driver
  "payment:manage", // add / refund / delete booking payments
  "pricing:calculate", // price calculator
  "company:manage", // B2B companies, members, statements, payments
  "finance:read",
  "payout:manage", // driver settlements
  "expense:manage",
  "report:read",
  "export:read", // CSV exports (customers, phones, money)
  "fleet:manage", // vehicles + maintenance/blocks
  "category:manage", // car types / sizes
  "coupon:manage",
  "customer:manage", // verify customer phone numbers, reset customer passwords
  "content:manage", // app texts, photos, phone numbers, FAQs
  "staff:manage",
  "settings:manage", // business settings + branch
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS;

/** Explicit role → permission map (super_admin has everything). */
export const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  super_admin: ALL,
  fleet_mgr: [
    "dashboard:read",
    "delivery:read",
    "delivery:update",
    "delivery:cash",
    "booking:read",
    "booking:update",
    "payment:manage",
    "fleet:manage",
    "category:manage",
  ],
  agent: [
    "dashboard:read",
    "delivery:read",
    "delivery:create",
    "delivery:update",
    "delivery:cash",
    "booking:read",
    "booking:create",
    "booking:update",
    "payment:manage",
    "pricing:calculate",
    "coupon:manage",
    "customer:manage",
  ],
  finance: [
    "dashboard:read",
    "delivery:cash",
    "payment:manage",
    "company:manage",
    "finance:read",
    "payout:manage",
    "expense:manage",
    "report:read",
    "export:read",
  ],
};

export function isAdminRole(role: string | null | undefined): role is AdminRole {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

export function can(role: string | null | undefined, permission: Permission): boolean {
  return isAdminRole(role) && ROLE_PERMISSIONS[role].includes(permission);
}
