/**
 * Helpers shared by the db/lib modules: row types (inferred from the drizzle-zod select schemas),
 * the `with` shapes every booking/order read uses (db.query relations), row → DTO mappers, and paging.
 *
 * Rows with JSON columns go through their select schema's `parse` so the JSON is typed (the driver
 * returns it as `unknown`); the other rows are already exactly the schema's shape.
 */
import { sql } from "drizzle-orm";
import type { z } from "zod";
import {
  bookings,
  selectBookingSchema,
  selectBranchSchema,
  selectCompanySchema,
  selectDeliveryOrderSchema,
  selectPaymentSchema,
  selectPricingRuleSchema,
  selectUserSchema,
  selectVehicleSchema,
} from "@/db/schema";
import type { PricingRule } from "@/engines/pricing";
import type {
  BookingDTO,
  BranchDTO,
  CompanyDTO,
  DeliveryOrderDTO,
  Page,
  PaymentDTO,
  StaffDTO,
  StaffRole,
  VehiclePricingInput,
} from "@/types";

export type UserRow = z.infer<typeof selectUserSchema>;
export type CompanyRow = z.infer<typeof selectCompanySchema>;
export type PaymentRow = z.infer<typeof selectPaymentSchema>;
export type BranchRow = z.infer<typeof selectBranchSchema>;
export type VehicleRow = z.infer<typeof selectVehicleSchema>;
export type BookingRow = z.infer<typeof selectBookingSchema>;
export type DeliveryOrderRow = z.infer<typeof selectDeliveryOrderSchema>;
export type PricingRuleRow = z.infer<typeof selectPricingRuleSchema>;

// ---------- paging / search ----------

/** Search text is literal, not a LIKE pattern. */
export const likeTerm = (q: string) => `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`;

export function toPage<T>(rows: T[], total: number, page: number, pageSize: number): Page<T> {
  return { rows, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export const countAll = sql<number>`count(*)::int`;

// ---------- branches ----------

export function branchWorking(b: BranchRow): { open: number; close: number } {
  return { open: b.workingHours.open ?? 8, close: b.workingHours.close ?? 22 };
}

export function mapBranch(raw: unknown): BranchDTO {
  const b = selectBranchSchema.parse(raw);
  return { id: b.id, name: b.name, address: b.address, lat: b.lat, lng: b.lng, working: branchWorking(b) };
}

// ---------- pricing rules ----------

export function rowToRule(raw: unknown): PricingRule {
  const row = selectPricingRuleSchema.parse(raw);
  return {
    tiers: row.tiers,
    dailyPrice: row.dailyPrice,
    extraHourPrice: row.extraHourPrice,
    weekendMultiplier: row.weekendMultiplier,
    peakMultiplier: row.peakMultiplier,
    peakWindow: row.peakWindow,
    holidayMultiplier: row.holidayMultiplier,
    holidayDates: row.holidayDates,
    driverFeePerHour: row.driverFeePerHour,
    loaderFeePerPerson: row.loaderFeePerPerson,
    perKmPrice: row.perKmPrice,
    deliveryFee: row.deliveryFee,
    deposit: row.deposit,
    minHours: row.minHours,
    maxHours: row.maxHours,
  };
}

/** Vehicle rule, else its category's, else the global one. */
export function resolveFromRows(
  rows: { scope: PricingRuleRow["scope"]; targetId: string | null }[],
  vehicleId: string,
  categoryId: string,
): PricingRule {
  const byVehicle = rows.find((r) => r.scope === "vehicle" && r.targetId === vehicleId);
  if (byVehicle) return rowToRule(byVehicle);
  const byCat = rows.find((r) => r.scope === "category" && r.targetId === categoryId);
  if (byCat) return rowToRule(byCat);
  const global = rows.find((r) => r.scope === "global");
  if (global) return rowToRule(global);
  throw new Error("NO_PRICING_RULE");
}

export function pricingRuleToInput(rule: PricingRule): VehiclePricingInput {
  const tier = (h: number) => rule.tiers.find((t) => t.hours === h)?.price ?? 0;
  return {
    hour1: tier(1),
    hour2: tier(2),
    hour4: tier(4),
    hour8: tier(8),
    daily: rule.dailyPrice,
    extraHour: rule.extraHourPrice,
    deposit: rule.deposit,
    driverFeePerHour: rule.driverFeePerHour,
    loaderFeePerPerson: rule.loaderFeePerPerson,
    perKmPrice: rule.perKmPrice,
    deliveryFee: rule.deliveryFee,
  };
}

/** Cheapest 1h-equivalent price, for the "من X/ساعة" label. */
export function fromHourly(rule: PricingRule): number {
  const one = rule.tiers.find((t) => t.hours === 1);
  if (one) return one.price;
  return Math.min(...rule.tiers.map((t) => Math.round(t.price / t.hours)));
}

// ---------- users / staff ----------

export function userToStaff(u: UserRow): StaffDTO {
  return {
    id: u.id,
    name: u.name ?? "",
    phone: u.phone,
    role: u.role as StaffRole,
    nationalId: u.nationalId,
    photo: u.photo,
    drivingLicense: u.drivingLicense,
    vehicleLicense: u.vehicleLicense,
    available: u.available,
    hasPassword: !!u.passwordHash,
  };
}

// ---------- companies ----------

export function mapCompany(r: CompanyRow): CompanyDTO {
  return r;
}

// ---------- bookings ----------

/** `with` for booking reads: the vehicle and branch names are read live, never copied into the booking. */
export const bookingWith = {
  vehicle: { columns: { id: true, name: true } },
  branch: { columns: { name: true } },
} as const;

type BookingRead = {
  vehicle: { id: string; name: string };
  branch: { name: string };
  driver?: { name: string | null } | null;
};

export function mapBooking(r: BookingRead, extra: { primaryImage?: string | null } = {}): BookingDTO {
  const bk = selectBookingSchema.parse(r);
  return {
    code: bk.code,
    vehicleId: r.vehicle.id,
    vehicleName: r.vehicle.name,
    primaryImage: extra.primaryImage ?? null,
    branchName: r.branch.name,
    startsAt: bk.startsAt,
    endsAt: bk.endsAt,
    hours: Math.round((bk.endsAt.getTime() - bk.startsAt.getTime()) / 3600000),
    status: bk.status,
    withDriver: bk.withDriver,
    delivery: bk.delivery,
    loaders: bk.loaders,
    driverId: bk.driverId,
    driverName: r.driver?.name ?? null,
    source: bk.source,
    agentName: bk.agentName,
    priceSnapshot: bk.priceSnapshot,
    contactName: bk.contactName,
    contactPhone: bk.contactPhone,
  };
}

/** Postgres constraint / trigger violations on bookings → domain errors. */
export function mapBookingError(e: unknown): never {
  const msg = (e as { message?: string })?.message ?? "";
  const code = (e as { code?: string })?.code ?? "";
  if (msg.includes("VEHICLE_BLOCKED")) throw new Error("VEHICLE_BLOCKED");
  if (code === "23P01" || msg.includes("bookings_no_overlap")) throw new Error("CONFLICT");
  throw e as Error;
}

/** Subquery: the id of the booking with this code. */
export const bookingIdByCode = (code: string) =>
  sql`(select ${bookings.id} from ${bookings} where ${bookings.code} = ${code})`;

// ---------- delivery orders ----------

/** `with` for order reads: the assigned driver's current name and phone (never stale). */
export const orderWith = { driver: { columns: { name: true, phone: true } } } as const;

type OrderRead = { driver?: { name: string | null; phone: string } | null };

export function mapDeliveryOrder(r: OrderRead): DeliveryOrderDTO {
  // the row id stays internal (orders are addressed by code)
  const { id, categoryId, ...order } = selectDeliveryOrderSchema.parse(r);
  return {
    ...order,
    categoryId: categoryId ?? "",
    driverName: r.driver?.name ?? null,
    driverPhone: r.driver?.phone ?? null,
  };
}

// ---------- payments ----------

export function mapPayment(p: PaymentRow, bookingCode: string): PaymentDTO {
  return {
    id: p.id,
    bookingCode,
    method: p.method,
    kind: p.kind,
    amount: p.amountPiastres,
    status: p.status,
    note: p.note,
    createdAt: p.createdAt,
  };
}
