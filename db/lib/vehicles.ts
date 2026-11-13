/** Fleet vehicles, their images and per-vehicle pricing rules. */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, type Executor } from "@/db/client";
import { vehicleCategories, vehicles, vehicleImages, pricingRules, bookings } from "@/db/schema";
import type { PricingRule } from "@/engines/pricing";
import { type VehicleKind, type VehicleStatus } from "@/lib/constants";
import type {
  FleetVehicle,
  VehicleAdminInfo,
  VehicleDetail,
  VehicleEditData,
  VehicleInput,
  VehicleListItem,
  VehiclePricingInput,
} from "@/types";
import { rowToRule, resolveFromRows, pricingRuleToInput, fromHourly } from "./shared";
import { getBusiness } from "./settings";

/** `with` for vehicle reads: type, branch and images (a handful per vehicle; ordered by `imagesInOrder`). */
const vehicleWith = {
  category: { columns: { kind: true, name: true } },
  branch: { columns: { id: true, name: true } },
  images: { columns: { url: true, isPrimary: true, sort: true } },
} as const;

type VehicleRead = NonNullable<Awaited<ReturnType<typeof findVehicle>>>;

function findVehicle(id: string) {
  return db.query.vehicles.findFirst({ where: (vehicles) => eq(vehicles.id, id), with: vehicleWith });
}

/** Primary image first, then by position. */
function imagesInOrder(v: VehicleRead): string[] {
  return [...v.images]
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sort - b.sort)
    .map((i) => i.url);
}

function toListItem(v: VehicleRead, rule: PricingRule): VehicleListItem {
  return {
    id: v.id,
    name: v.name,
    kind: v.category.kind,
    categoryId: v.categoryId,
    categoryName: v.category.name,
    seats: v.seats,
    cargoKg: v.cargoKg,
    status: v.status,
    primaryImage: imagesInOrder(v)[0] ?? null,
    fromHourlyPiastres: fromHourly(rule),
    branchId: v.branch.id,
    branchName: v.branch.name,
  };
}

export async function listVehicles(kind?: VehicleKind): Promise<VehicleListItem[]> {
  const [rows, rules] = await Promise.all([
    db.query.vehicles.findMany({
      where: (vehicles) =>
        kind
          ? inArray(
              vehicles.categoryId,
              db
                .select({ id: vehicleCategories.id })
                .from(vehicleCategories)
                .where(eq(vehicleCategories.kind, kind)),
            )
          : undefined,
      with: vehicleWith,
    }),
    db.query.pricingRules.findMany(),
  ]);
  return rows.map((v) => toListItem(v, resolveFromRows(rules, v.id, v.categoryId)));
}

/** The admin-only columns of a vehicle row. */
function adminInfo(v: VehicleAdminInfo): VehicleAdminInfo {
  return {
    driverId: v.driverId,
    ownerIsDriver: v.ownerIsDriver,
    ownerName: v.ownerName,
    ownerPhone: v.ownerPhone,
    ownerNationalId: v.ownerNationalId,
    ownerPhoto: v.ownerPhoto,
    licenseNumber: v.licenseNumber,
    licenseExpiry: v.licenseExpiry,
    licensePhoto: v.licensePhoto,
    notes: v.notes,
  };
}

/** Admin fleet page: every vehicle with its plate, driver and owner. Admin only. */
export async function listFleet(): Promise<FleetVehicle[]> {
  const [rows, rules] = await Promise.all([
    db.query.vehicles.findMany({
      with: {
        ...vehicleWith,
        driver: {
          columns: {
            id: true,
            name: true,
            phone: true,
            photo: true,
            nationalId: true,
            drivingLicense: true,
            vehicleLicense: true,
            available: true,
          },
        },
      },
      orderBy: (vehicles) => vehicles.name,
    }),
    db.query.pricingRules.findMany(),
  ]);
  return rows.map((v) => ({
    ...toListItem(v, resolveFromRows(rules, v.id, v.categoryId)),
    plate: v.plate,
    admin: adminInfo(v),
    driver: v.driver ? { ...v.driver, name: v.driver.name ?? "" } : null,
  }));
}

export async function getVehicle(id: string): Promise<VehicleDetail | null> {
  const [v, rules] = await Promise.all([findVehicle(id), db.query.pricingRules.findMany()]);
  if (!v) return null;
  const rule = resolveFromRows(rules, id, v.categoryId);
  return {
    ...toListItem(v, rule),
    brand: v.brand,
    model: v.model,
    year: v.year,
    color: v.color,
    transmission: v.transmission,
    fuel: v.fuel,
    hasDriverOption: v.hasDriverOption,
    images: imagesInOrder(v),
    rule,
  };
}

export async function getVehicleForEdit(id: string): Promise<VehicleEditData | null> {
  const [detail, v] = await Promise.all([
    getVehicle(id),
    db.query.vehicles.findFirst({ where: (vehicles) => eq(vehicles.id, id) }),
  ]);
  if (!detail || !v) return null;
  return { ...detail, plate: v.plate, pricing: pricingRuleToInput(detail.rule), admin: adminInfo(v) };
}

export async function resolveRule(vehicleId: string): Promise<PricingRule> {
  const [v, rules] = await Promise.all([
    db.query.vehicles.findFirst({
      where: (vehicles) => eq(vehicles.id, vehicleId),
      columns: { categoryId: true },
    }),
    db.query.pricingRules.findMany(),
  ]);
  if (!v) throw new Error("VEHICLE_NOT_FOUND");
  return resolveFromRows(rules, vehicleId, v.categoryId);
}

export async function defaultPricingInput(): Promise<VehiclePricingInput> {
  const g = await db.query.pricingRules.findFirst({
    where: (pricingRules) => eq(pricingRules.scope, "global"),
  });
  if (g) return pricingRuleToInput(rowToRule(g));
  return {
    hour1: 25000,
    hour2: 45000,
    hour4: 80000,
    hour8: 150000,
    daily: 300000,
    extraHour: 25000,
    deposit: 50000,
    driverFeePerHour: 5000,
    loaderFeePerPerson: 8000,
    perKmPrice: 500,
    deliveryFee: 10000,
  };
}

/** A vehicle can only be linked to a staff account with role driver. */
export async function isDriver(userId: string): Promise<boolean> {
  const u = await db.query.users.findFirst({
    where: (users) => eq(users.id, userId),
    columns: { role: true },
  });
  return u?.role === "driver";
}

export async function isVehicleBookable(vehicleId: string): Promise<boolean> {
  const v = await db.query.vehicles.findFirst({ where: (vehicles) => eq(vehicles.id, vehicleId) });
  return !!v && v.status !== "inactive" && v.status !== "maintenance";
}

/** Vehicle + primary image + pricing rule, all or nothing. */
export async function createVehicle(input: VehicleInput): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const branch = input.branchId
      ? { id: input.branchId }
      : await tx.query.branches.findFirst({
          where: (branches) => eq(branches.active, true),
          columns: { id: true },
        });
    if (!branch) throw new Error("NO_ACTIVE_BRANCH");
    const [created] = await tx
      .insert(vehicles)
      .values({
        categoryId: input.categoryId,
        branchId: branch.id,
        name: input.name,
        plate: input.plate,
        brand: input.brand ?? null,
        model: input.model ?? null,
        year: input.year ?? null,
        color: input.color ?? null,
        transmission: input.transmission,
        fuel: input.fuel,
        seats: input.seats ?? null,
        cargoKg: input.cargoKg ?? null,
        hasDriverOption: input.hasDriverOption,
        status: input.status,
        ...adminColumns(input),
      })
      .returning({ id: vehicles.id });
    if (input.imageUrl) {
      await tx
        .insert(vehicleImages)
        .values({ vehicleId: created.id, url: input.imageUrl, isPrimary: true, sort: 0 });
    }
    await upsertVehiclePricing(tx, created.id, input.pricing);
    return { id: created.id };
  });
}

export async function updateVehicle(id: string, input: VehicleInput): Promise<boolean> {
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(vehicles)
      .set({
        categoryId: input.categoryId,
        name: input.name,
        plate: input.plate,
        brand: input.brand ?? null,
        model: input.model ?? null,
        year: input.year ?? null,
        color: input.color ?? null,
        transmission: input.transmission,
        fuel: input.fuel,
        seats: input.seats ?? null,
        cargoKg: input.cargoKg ?? null,
        hasDriverOption: input.hasDriverOption,
        status: input.status,
        ...adminColumns(input),
      })
      .where(eq(vehicles.id, id))
      .returning({ id: vehicles.id });
    if (!updated.length) return false;
    if (input.imageUrl) {
      const existing = await tx.query.vehicleImages.findMany({
        where: (vehicleImages) => eq(vehicleImages.vehicleId, id),
        limit: 1,
      });
      if (existing.length)
        await tx
          .update(vehicleImages)
          .set({ url: input.imageUrl })
          .where(eq(vehicleImages.id, existing[0].id));
      else
        await tx
          .insert(vehicleImages)
          .values({ vehicleId: id, url: input.imageUrl, isPrimary: true, sort: 0 });
    }
    await upsertVehiclePricing(tx, id, input.pricing);
    return true;
  });
}

export async function setVehicleStatus(id: string, status: VehicleStatus): Promise<boolean> {
  await db.update(vehicles).set({ status }).where(eq(vehicles.id, id));
  return true;
}

/** A vehicle with bookings is only deactivated (its history stays); otherwise it and its rule go. */
export async function deleteVehicle(id: string): Promise<{ deleted: boolean; deactivated: boolean }> {
  return db.transaction(async (tx) => {
    // lock the vehicle so a booking can't land between the check and the delete
    const [locked] = await tx
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.id, id))
      .for("update");
    if (!locked) return { deleted: false, deactivated: false };
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(eq(bookings.vehicleId, id));
    if (count > 0) {
      await tx.update(vehicles).set({ status: "inactive" }).where(eq(vehicles.id, id));
      return { deleted: false, deactivated: true };
    }
    await tx
      .delete(pricingRules)
      .where(and(eq(pricingRules.scope, "vehicle"), eq(pricingRules.targetId, id)));
    await tx.delete(vehicles).where(eq(vehicles.id, id));
    return { deleted: true, deactivated: false };
  });
}

/** Driver / owner / licence columns from the form. When the driver owns it, the owner_* fields are cleared. */
function adminColumns(input: VehicleInput) {
  const own = input.ownerIsDriver ?? true;
  return {
    driverId: input.driverId ?? null,
    ownerIsDriver: own,
    ownerName: own ? null : (input.ownerName ?? null),
    ownerPhone: own ? null : (input.ownerPhone ?? null),
    ownerNationalId: own ? null : (input.ownerNationalId ?? null),
    ownerPhoto: own ? null : (input.ownerPhoto ?? null),
    licenseNumber: input.licenseNumber ?? null,
    licenseExpiry: input.licenseExpiry ?? null,
    licensePhoto: input.licensePhoto ?? null,
    notes: input.notes ?? null,
  };
}

/** The vehicle's own pricing rule (created on first save), inside the vehicle transaction. */
async function upsertVehiclePricing(tx: Executor, vehicleId: string, p: VehiclePricingInput): Promise<void> {
  const business = await getBusiness();
  const tiers = [
    { hours: 1, price: p.hour1 },
    { hours: 2, price: p.hour2 },
    { hours: 4, price: p.hour4 },
    { hours: 8, price: p.hour8 },
  ].filter((t) => t.price > 0);
  const existing = await tx.query.pricingRules.findFirst({
    where: (pricingRules) => and(eq(pricingRules.scope, "vehicle"), eq(pricingRules.targetId, vehicleId)),
  });
  const fields = {
    tiers,
    dailyPrice: p.daily,
    extraHourPrice: p.extraHour,
    deposit: p.deposit,
    driverFeePerHour: p.driverFeePerHour,
    loaderFeePerPerson: p.loaderFeePerPerson,
    perKmPrice: p.perKmPrice,
    deliveryFee: p.deliveryFee,
    minHours: business.minHours,
    maxHours: business.maxHours,
    bufferMinutes: business.bufferMinutes,
  };
  if (existing) {
    await tx.update(pricingRules).set(fields).where(eq(pricingRules.id, existing.id));
  } else {
    await tx.insert(pricingRules).values({ scope: "vehicle", targetId: vehicleId, ...fields });
  }
}
