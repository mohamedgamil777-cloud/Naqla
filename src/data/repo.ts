/**
 * Data access. Uses Postgres (Drizzle) when DATABASE_URL is set, otherwise the
 * in-memory seed store. Both return identical DTOs and run the same engines.
 */
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db, hasDb, schema } from "@/db";
import { memRepo } from "./memory";
import type { PricingRule, PromoInput, Quote, Tier } from "@/engines/pricing";
import type {
  BlockDTO,
  BlockInput,
  BookingDTO,
  BranchDTO,
  BusinessSettings,
  BusyInterval,
  CategoryDTO,
  CategoryInput,
  CouponDTO,
  CouponInput,
  CreateBookingInput,
  DeliveryOrderDTO,
  DeliveryOrderInput,
  DeliveryOrderStatus,
  DocumentDTO,
  DocumentInput,
  PaymentDTO,
  PaymentInput,
  StaffDTO,
  StaffInput,
  StaffRole,
  VehicleDetail,
  VehicleEditData,
  VehicleInput,
  VehiclePricingInput,
  VehicleListItem,
} from "./types";
import type { VehicleKind, VehicleStatus } from "@/lib/constants";
import { BLOCKING_STATUSES, DEFAULTS, newBookingCode } from "@/lib/constants";

const { vehicleCategories, vehicles, vehicleImages, branches, pricingRules, bookings, vehicleBlocks, promoCodes, otpCodes, users, settings, payments, documents, deliveryOrders } =
  schema;

function pricingRuleToInput(rule: PricingRule): VehiclePricingInput {
  const tier = (h: number) => rule.tiers.find((t) => t.hours === h)?.price ?? 0;
  return {
    hour1: tier(1), hour2: tier(2), hour4: tier(4), hour8: tier(8),
    daily: rule.dailyPrice, extraHour: rule.extraHourPrice, deposit: rule.deposit,
    driverFeePerHour: rule.driverFeePerHour, loaderFeePerPerson: rule.loaderFeePerPerson, perKmPrice: rule.perKmPrice, deliveryFee: rule.deliveryFee,
  };
}

type RuleRow = typeof pricingRules.$inferSelect;

function rowToRule(row: RuleRow): PricingRule {
  return {
    tiers: (row.tiers as Tier[]) ?? [],
    dailyPrice: row.dailyPrice,
    extraHourPrice: row.extraHourPrice,
    weekendMultiplier: row.weekendMultiplier,
    peakMultiplier: row.peakMultiplier,
    peakWindow: (row.peakWindow as { from: number; to: number } | null) ?? null,
    holidayMultiplier: row.holidayMultiplier,
    holidayDates: (row.holidayDates as string[]) ?? [],
    driverFeePerHour: row.driverFeePerHour,
    loaderFeePerPerson: row.loaderFeePerPerson,
    perKmPrice: row.perKmPrice,
    deliveryFee: row.deliveryFee,
    deposit: row.deposit,
    minHours: row.minHours,
    maxHours: row.maxHours,
  };
}

function resolveFromRows(rows: RuleRow[], vehicleId: string, categoryId: string): PricingRule {
  const byVehicle = rows.find((r) => r.scope === "vehicle" && r.targetId === vehicleId);
  if (byVehicle) return rowToRule(byVehicle);
  const byCat = rows.find((r) => r.scope === "category" && r.targetId === categoryId);
  if (byCat) return rowToRule(byCat);
  const global = rows.find((r) => r.scope === "global");
  if (global) return rowToRule(global);
  throw new Error("NO_PRICING_RULE");
}

function fromHourly(rule: PricingRule): number {
  const one = rule.tiers.find((t) => t.hours === 1);
  if (one) return one.price;
  return Math.min(...rule.tiers.map((t) => Math.round(t.price / t.hours)));
}

function branchWorking(b: typeof branches.$inferSelect): { open: number; close: number } {
  const wh = (b.workingHours as { open?: number; close?: number }) ?? {};
  return { open: wh.open ?? 8, close: wh.close ?? 22 };
}

function mapDeliveryOrder(r: typeof deliveryOrders.$inferSelect, driverName: string | null = null): DeliveryOrderDTO {
  return {
    code: r.code,
    categoryId: r.categoryId ?? "",
    sizeName: r.sizeName,
    sizeCode: r.sizeCode ?? null,
    pickupAddress: r.pickupAddress ?? null,
    dropoffAddress: r.dropoffAddress ?? null,
    pickupLat: r.pickupLat ?? null,
    pickupLng: r.pickupLng ?? null,
    dropoffLat: r.dropoffLat ?? null,
    dropoffLng: r.dropoffLng ?? null,
    km: r.km,
    loaders: r.loaders,
    scheduledAt: r.scheduledAt,
    status: r.status,
    driverId: r.driverId ?? null,
    driverName,
    priceSnapshot: r.priceSnapshot as Quote,
    contactName: r.contactName ?? null,
    contactPhone: r.contactPhone ?? null,
    createdAt: r.createdAt,
  };
}

/** Booking error mapper for Postgres constraint/trigger violations. */
function mapBookingError(e: unknown): never {
  const msg = (e as { message?: string })?.message ?? "";
  const code = (e as { code?: string })?.code ?? "";
  if (msg.includes("VEHICLE_BLOCKED")) throw new Error("VEHICLE_BLOCKED");
  if (code === "23P01" || msg.includes("bookings_no_overlap")) throw new Error("CONFLICT");
  throw e as Error;
}

const pgRepo = {
  listCategories: async (): Promise<CategoryDTO[]> => {
    const rows = await db!.select().from(vehicleCategories).orderBy(vehicleCategories.sort);
    return rows.map((r) => ({
      id: r.id, kind: r.kind, name: r.name, sort: r.sort,
      sizeCode: r.sizeCode ?? null, capacityKg: r.capacityKg ?? null, dims: r.dims ?? null,
      description: r.description ?? null, image: r.image ?? null,
      baseFare: r.baseFare, perKm: r.perKm,
    }));
  },

  defaultBranch: async (): Promise<BranchDTO> => {
    const [b] = await db!.select().from(branches).where(eq(branches.active, true)).limit(1);
    return { id: b.id, name: b.name, address: b.address, lat: b.lat, lng: b.lng, working: branchWorking(b) };
  },
  getBranch: async (id: string): Promise<BranchDTO | null> => {
    const [b] = await db!.select().from(branches).where(eq(branches.id, id)).limit(1);
    return b ? { id: b.id, name: b.name, address: b.address, lat: b.lat, lng: b.lng, working: branchWorking(b) } : null;
  },
  listBranches: async (): Promise<BranchDTO[]> => {
    const rows = await db!.select().from(branches).where(eq(branches.active, true));
    return rows.map((b) => ({ id: b.id, name: b.name, address: b.address, lat: b.lat, lng: b.lng, working: branchWorking(b) }));
  },

  listVehicles: async (kind?: VehicleKind): Promise<VehicleListItem[]> => {
    const rows = await db!
      .select({ v: vehicles, c: vehicleCategories, b: branches })
      .from(vehicles)
      .innerJoin(vehicleCategories, eq(vehicles.categoryId, vehicleCategories.id))
      .innerJoin(branches, eq(vehicles.branchId, branches.id));
    const filtered = rows.filter((r) => (kind ? r.c.kind === kind : true));
    const ids = filtered.map((r) => r.v.id);
    const imgs = ids.length ? await db!.select().from(vehicleImages).where(inArray(vehicleImages.vehicleId, ids)) : [];
    const rules = await db!.select().from(pricingRules);
    return filtered.map((r) => {
      const primary = imgs.find((i) => i.vehicleId === r.v.id && i.isPrimary) ?? imgs.find((i) => i.vehicleId === r.v.id);
      const rule = resolveFromRows(rules, r.v.id, r.v.categoryId);
      return {
        id: r.v.id,
        name: r.v.name,
        kind: r.c.kind,
        categoryId: r.v.categoryId,
        categoryName: r.c.name,
        seats: r.v.seats,
        cargoKg: r.v.cargoKg,
        status: r.v.status,
        primaryImage: primary?.url ?? null,
        fromHourlyPiastres: fromHourly(rule),
        branchId: r.b.id,
        branchName: r.b.name,
      };
    });
  },

  getVehicle: async (id: string): Promise<VehicleDetail | null> => {
    const [r] = await db!
      .select({ v: vehicles, c: vehicleCategories, b: branches })
      .from(vehicles)
      .innerJoin(vehicleCategories, eq(vehicles.categoryId, vehicleCategories.id))
      .innerJoin(branches, eq(vehicles.branchId, branches.id))
      .where(eq(vehicles.id, id))
      .limit(1);
    if (!r) return null;
    const imgs = await db!.select().from(vehicleImages).where(eq(vehicleImages.vehicleId, id)).orderBy(vehicleImages.sort);
    const rules = await db!.select().from(pricingRules);
    const rule = resolveFromRows(rules, id, r.v.categoryId);
    return {
      id: r.v.id,
      name: r.v.name,
      kind: r.c.kind,
      categoryId: r.v.categoryId,
      categoryName: r.c.name,
      seats: r.v.seats,
      cargoKg: r.v.cargoKg,
      status: r.v.status,
      primaryImage: imgs[0]?.url ?? null,
      fromHourlyPiastres: fromHourly(rule),
      branchId: r.b.id,
      branchName: r.b.name,
      brand: r.v.brand,
      model: r.v.model,
      year: r.v.year,
      color: r.v.color,
      transmission: r.v.transmission,
      fuel: r.v.fuel,
      hasDriverOption: r.v.hasDriverOption,
      images: imgs.map((i) => i.url),
      rule,
    };
  },

  resolveRule: async (vehicleId: string): Promise<PricingRule> => {
    const [v] = await db!.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
    const rules = await db!.select().from(pricingRules);
    return resolveFromRows(rules, vehicleId, v.categoryId);
  },

  defaultPricingInput: async (): Promise<VehiclePricingInput> => {
    const [g] = await db!.select().from(pricingRules).where(eq(pricingRules.scope, "global")).limit(1);
    if (g) return pricingRuleToInput(rowToRule(g));
    return {
      hour1: 25000, hour2: 45000, hour4: 80000, hour8: 150000, daily: 300000,
      extraHour: 25000, deposit: 50000, driverFeePerHour: 5000, loaderFeePerPerson: 8000, perKmPrice: 500, deliveryFee: 10000,
    };
  },

  isVehicleBookable: async (vehicleId: string): Promise<boolean> => {
    const [v] = await db!.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
    return !!v && v.status !== "inactive" && v.status !== "maintenance";
  },

  getBusy: async (vehicleId: string): Promise<BusyInterval[]> => {
    const bks = await db!
      .select({ s: bookings.startsAt, e: bookings.endsAt })
      .from(bookings)
      .where(and(eq(bookings.vehicleId, vehicleId), inArray(bookings.status, BLOCKING_STATUSES)));
    const blks = await db!
      .select({ s: vehicleBlocks.startsAt, e: vehicleBlocks.endsAt })
      .from(vehicleBlocks)
      .where(eq(vehicleBlocks.vehicleId, vehicleId));
    return [...bks, ...blks].map((r) => ({ start: r.s, end: r.e }));
  },

  getBusyExcept: async (vehicleId: string, exceptCode: string): Promise<BusyInterval[]> => {
    const bks = await db!
      .select({ s: bookings.startsAt, e: bookings.endsAt })
      .from(bookings)
      .where(and(eq(bookings.vehicleId, vehicleId), inArray(bookings.status, BLOCKING_STATUSES), ne(bookings.code, exceptCode)));
    const blks = await db!
      .select({ s: vehicleBlocks.startsAt, e: vehicleBlocks.endsAt })
      .from(vehicleBlocks)
      .where(eq(vehicleBlocks.vehicleId, vehicleId));
    return [...bks, ...blks].map((r) => ({ start: r.s, end: r.e }));
  },

  updateBookingSchedule: async (code: string, endsAt: Date, quote: Quote): Promise<boolean> => {
    try {
      await db!.update(bookings).set({ endsAt, priceSnapshot: quote }).where(eq(bookings.code, code));
      return true;
    } catch (e) {
      mapBookingError(e);
    }
  },

  createBooking: async (input: CreateBookingInput, quote: Quote, branchId: string): Promise<{ code: string }> => {
    const code = newBookingCode();
    try {
      await db!.insert(bookings).values({
        code,
        vehicleId: input.vehicleId,
        branchId,
        customerId: input.customerId ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        status: "pending",
        withDriver: input.withDriver,
        delivery: input.delivery,
        loaders: input.loaders ?? 0,
        source: input.source ?? "customer",
        agentName: input.agentName ?? null,
        deliveryAddress: input.deliveryAddress ?? null,
        priceSnapshot: quote,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
      });
      return { code };
    } catch (e) {
      mapBookingError(e);
    }
  },

  getBooking: async (code: string): Promise<BookingDTO | null> => {
    const [r] = await db!
      .select({ bk: bookings, v: vehicles, b: branches })
      .from(bookings)
      .innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
      .innerJoin(branches, eq(bookings.branchId, branches.id))
      .where(eq(bookings.code, code))
      .limit(1);
    if (!r) return null;
    const [img] = await db!.select().from(vehicleImages).where(eq(vehicleImages.vehicleId, r.v.id)).limit(1);
    let driverName: string | null = null;
    if (r.bk.driverId) {
      const [d] = await db!.select({ name: users.name }).from(users).where(eq(users.id, r.bk.driverId)).limit(1);
      driverName = d?.name ?? null;
    }
    return {
      code: r.bk.code,
      vehicleId: r.v.id,
      vehicleName: r.v.name,
      primaryImage: img?.url ?? null,
      branchName: r.b.name,
      startsAt: r.bk.startsAt,
      endsAt: r.bk.endsAt,
      hours: Math.round((r.bk.endsAt.getTime() - r.bk.startsAt.getTime()) / 3600000),
      status: r.bk.status,
      withDriver: r.bk.withDriver,
      delivery: r.bk.delivery,
      loaders: r.bk.loaders,
      driverId: r.bk.driverId,
      driverName,
      source: r.bk.source,
      agentName: r.bk.agentName,
      priceSnapshot: r.bk.priceSnapshot as Quote,
      contactName: r.bk.contactName,
      contactPhone: r.bk.contactPhone,
    };
  },

  listBookingsByPhone: async (phone: string): Promise<BookingDTO[]> => {
    const rows = await db!
      .select({ bk: bookings, v: vehicles, b: branches })
      .from(bookings)
      .innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
      .innerJoin(branches, eq(bookings.branchId, branches.id))
      .where(eq(bookings.contactPhone, phone))
      .orderBy(desc(bookings.startsAt));
    return rows.map((r) => ({
      code: r.bk.code,
      vehicleId: r.v.id,
      vehicleName: r.v.name,
      primaryImage: null,
      branchName: r.b.name,
      startsAt: r.bk.startsAt,
      endsAt: r.bk.endsAt,
      hours: Math.round((r.bk.endsAt.getTime() - r.bk.startsAt.getTime()) / 3600000),
      status: r.bk.status,
      withDriver: r.bk.withDriver,
      delivery: r.bk.delivery,
      loaders: r.bk.loaders,
      driverId: r.bk.driverId,
      driverName: null,
      source: r.bk.source,
      agentName: r.bk.agentName,
      priceSnapshot: r.bk.priceSnapshot as Quote,
      contactName: r.bk.contactName,
      contactPhone: r.bk.contactPhone,
    }));
  },

  listAllBookings: async (): Promise<BookingDTO[]> => {
    const rows = await db!
      .select({ bk: bookings, v: vehicles, b: branches })
      .from(bookings)
      .innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
      .innerJoin(branches, eq(bookings.branchId, branches.id))
      .orderBy(bookings.startsAt);
    return rows.map((r) => ({
      code: r.bk.code,
      vehicleId: r.v.id,
      vehicleName: r.v.name,
      primaryImage: null,
      branchName: r.b.name,
      startsAt: r.bk.startsAt,
      endsAt: r.bk.endsAt,
      hours: Math.round((r.bk.endsAt.getTime() - r.bk.startsAt.getTime()) / 3600000),
      status: r.bk.status,
      withDriver: r.bk.withDriver,
      delivery: r.bk.delivery,
      loaders: r.bk.loaders,
      driverId: r.bk.driverId,
      driverName: null,
      source: r.bk.source,
      agentName: r.bk.agentName,
      priceSnapshot: r.bk.priceSnapshot as Quote,
      contactName: r.bk.contactName,
      contactPhone: r.bk.contactPhone,
    }));
  },

  cancelBooking: async (code: string, phone: string): Promise<boolean> => {
    const res = await db!
      .update(bookings)
      .set({ status: "cancelled" })
      .where(and(eq(bookings.code, code), eq(bookings.contactPhone, phone), inArray(bookings.status, ["pending", "confirmed", "ready"])))
      .returning({ id: bookings.id });
    return res.length > 0;
  },

  validatePromo: async (code: string, subtotal: number): Promise<PromoInput | null> => {
    const [p] = await db!.select().from(promoCodes).where(and(eq(promoCodes.code, code.trim()), eq(promoCodes.active, true))).limit(1);
    if (!p) return null;
    const now = new Date();
    if (p.validFrom && now < p.validFrom) return null;
    if (p.validTo && now > p.validTo) return null;
    if (p.maxUses != null && p.used >= p.maxUses) return null;
    if (subtotal < p.minValue) return null;
    return { code: p.code, type: p.type, value: p.value };
  },

  // ---------- coupons / promo codes ----------
  listCoupons: async (): Promise<CouponDTO[]> => {
    const rows = await db!.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
    return rows.map((p) => ({
      id: p.id,
      code: p.code,
      type: p.type,
      value: p.value,
      minValue: p.minValue,
      validTo: p.validTo ? p.validTo.toISOString().slice(0, 10) : null,
      maxUses: p.maxUses ?? null,
      used: p.used,
      active: p.active,
    }));
  },
  createCoupon: async (input: CouponInput): Promise<{ id: string }> => {
    const [created] = await db!
      .insert(promoCodes)
      .values({
        code: input.code.trim(),
        type: input.type,
        value: input.value,
        minValue: input.minValue,
        validTo: input.validTo ? new Date(input.validTo + "T23:59:59") : null,
        maxUses: input.maxUses ?? null,
        active: input.active,
      })
      .returning({ id: promoCodes.id });
    return { id: created.id };
  },
  updateCoupon: async (id: string, input: CouponInput): Promise<boolean> => {
    await db!
      .update(promoCodes)
      .set({
        code: input.code.trim(),
        type: input.type,
        value: input.value,
        minValue: input.minValue,
        validTo: input.validTo ? new Date(input.validTo + "T23:59:59") : null,
        maxUses: input.maxUses ?? null,
        active: input.active,
      })
      .where(eq(promoCodes.id, id));
    return true;
  },
  deleteCoupon: async (id: string): Promise<boolean> => {
    await db!.delete(promoCodes).where(eq(promoCodes.id, id));
    return true;
  },

  // ---------- delivery orders (A→B) ----------
  createDeliveryOrder: async (
    input: DeliveryOrderInput,
    quote: Quote,
    sizeName: string,
    sizeCode: string | null
  ): Promise<{ code: string }> => {
    const code = newBookingCode();
    await db!.insert(deliveryOrders).values({
      code,
      categoryId: input.categoryId,
      sizeName,
      sizeCode,
      pickupAddress: input.pickupAddress ?? null,
      dropoffAddress: input.dropoffAddress ?? null,
      pickupLat: input.pickupLat ?? null,
      pickupLng: input.pickupLng ?? null,
      dropoffLat: input.dropoffLat ?? null,
      dropoffLng: input.dropoffLng ?? null,
      km: input.km,
      loaders: input.loaders,
      scheduledAt: input.scheduledAt,
      priceSnapshot: quote,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
    });
    return { code };
  },
  listDeliveryOrders: async (): Promise<DeliveryOrderDTO[]> => {
    const rows = await db!
      .select({ o: deliveryOrders, driverName: users.name })
      .from(deliveryOrders)
      .leftJoin(users, eq(deliveryOrders.driverId, users.id))
      .orderBy(desc(deliveryOrders.createdAt));
    return rows.map((r) => mapDeliveryOrder(r.o, r.driverName ?? null));
  },
  listDeliveryOrdersByPhone: async (phone: string): Promise<DeliveryOrderDTO[]> => {
    const rows = await db!
      .select({ o: deliveryOrders, driverName: users.name })
      .from(deliveryOrders)
      .leftJoin(users, eq(deliveryOrders.driverId, users.id))
      .where(eq(deliveryOrders.contactPhone, phone))
      .orderBy(desc(deliveryOrders.createdAt));
    return rows.map((r) => mapDeliveryOrder(r.o, r.driverName ?? null));
  },
  listDeliveryOrdersByDriver: async (driverId: string): Promise<DeliveryOrderDTO[]> => {
    const rows = await db!
      .select({ o: deliveryOrders, driverName: users.name })
      .from(deliveryOrders)
      .leftJoin(users, eq(deliveryOrders.driverId, users.id))
      .where(eq(deliveryOrders.driverId, driverId))
      .orderBy(deliveryOrders.scheduledAt);
    return rows.map((r) => mapDeliveryOrder(r.o, r.driverName ?? null));
  },
  getDeliveryOrder: async (code: string): Promise<DeliveryOrderDTO | null> => {
    const [r] = await db!
      .select({ o: deliveryOrders, driverName: users.name })
      .from(deliveryOrders)
      .leftJoin(users, eq(deliveryOrders.driverId, users.id))
      .where(eq(deliveryOrders.code, code))
      .limit(1);
    return r ? mapDeliveryOrder(r.o, r.driverName ?? null) : null;
  },
  updateDeliveryOrderStatus: async (code: string, status: DeliveryOrderStatus): Promise<boolean> => {
    const res = await db!.update(deliveryOrders).set({ status }).where(eq(deliveryOrders.code, code)).returning({ id: deliveryOrders.id });
    return res.length > 0;
  },
  assignDeliveryDriver: async (code: string, driverId: string | null): Promise<boolean> => {
    const res = await db!
      .update(deliveryOrders)
      .set(driverId ? { driverId, status: "assigned" } : { driverId: null })
      .where(eq(deliveryOrders.code, code))
      .returning({ id: deliveryOrders.id });
    return res.length > 0;
  },

  saveOtp: async (phone: string, codeHash: string, expiresAt: Date) => {
    await db!.insert(otpCodes).values({ phone, codeHash, expiresAt });
  },
  latestOtp: async (phone: string) => {
    const [o] = await db!.select().from(otpCodes).where(eq(otpCodes.phone, phone)).orderBy(desc(otpCodes.createdAt)).limit(1);
    if (!o || o.consumedAt) return null;
    return { phone: o.phone, codeHash: o.codeHash, expiresAt: o.expiresAt, attempts: o.attempts, consumed: false, createdAt: o.createdAt };
  },
  bumpOtpAttempt: async (phone: string) => {
    const [o] = await db!.select().from(otpCodes).where(eq(otpCodes.phone, phone)).orderBy(desc(otpCodes.createdAt)).limit(1);
    if (o) await db!.update(otpCodes).set({ attempts: o.attempts + 1 }).where(eq(otpCodes.id, o.id));
  },
  consumeOtp: async (phone: string) => {
    const [o] = await db!.select().from(otpCodes).where(eq(otpCodes.phone, phone)).orderBy(desc(otpCodes.createdAt)).limit(1);
    if (o) await db!.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, o.id));
  },
  upsertUser: async (phone: string, name?: string) => {
    const [existing] = await db!.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (existing) {
      if (name) await db!.update(users).set({ name }).where(eq(users.id, existing.id));
      return { id: existing.id, phone, name: name ?? existing.name };
    }
    const [created] = await db!.insert(users).values({ phone, name: name ?? null }).returning();
    return { id: created.id, phone, name: created.name };
  },

  // ---------- business settings ----------
  getBusiness: async (): Promise<BusinessSettings> => {
    const [row] = await db!.select().from(settings).where(eq(settings.key, "business")).limit(1);
    const v = (row?.value as Partial<BusinessSettings>) ?? {};
    return {
      bufferMinutes: v.bufferMinutes ?? DEFAULTS.bufferMinutes,
      minHours: v.minHours ?? DEFAULTS.minHours,
      maxHours: v.maxHours ?? DEFAULTS.maxHours,
      advanceDays: v.advanceDays ?? DEFAULTS.advanceDays,
      nowLeadHours: v.nowLeadHours ?? DEFAULTS.nowLeadHours,
      freeCancelHours: v.freeCancelHours ?? DEFAULTS.freeCancelHours,
      vatRate: v.vatRate ?? DEFAULTS.vatRate,
      currency: v.currency ?? DEFAULTS.currency,
      timezone: v.timezone ?? DEFAULTS.timezone,
      durationOptions: v.durationOptions ?? [...DEFAULTS.durationOptions],
    };
  },
  updateBusiness: async (input: Partial<BusinessSettings>): Promise<boolean> => {
    const current = await pgRepo.getBusiness();
    const merged = { ...current, ...input };
    await db!
      .insert(settings)
      .values({ key: "business", value: merged })
      .onConflictDoUpdate({ target: settings.key, set: { value: merged } });
    return true;
  },

  getVehicleForEdit: async (id: string): Promise<VehicleEditData | null> => {
    const detail = await pgRepo.getVehicle(id);
    if (!detail) return null;
    const [v] = await db!.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
    return { ...detail, plate: v.plate, categoryId: v.categoryId, pricing: pricingRuleToInput(detail.rule) };
  },

  // ---------- admin: vehicles ----------
  createVehicle: async (input: VehicleInput): Promise<{ id: string }> => {
    const [branch] = await db!.select().from(branches).where(eq(branches.active, true)).limit(1);
    const [created] = await db!
      .insert(vehicles)
      .values({
        categoryId: input.categoryId,
        branchId: input.branchId ?? branch.id,
        name: input.name,
        plate: input.plate,
        brand: input.brand ?? null,
        model: input.model ?? null,
        year: input.year ?? null,
        color: input.color ?? null,
        transmission: (input.transmission as "manual" | "automatic") ?? "manual",
        fuel: (input.fuel as "benzine" | "diesel" | "gas" | "electric") ?? "benzine",
        seats: input.seats ?? null,
        cargoKg: input.cargoKg ?? null,
        hasDriverOption: input.hasDriverOption,
        status: input.status,
      })
      .returning({ id: vehicles.id });
    if (input.imageUrl) {
      await db!.insert(vehicleImages).values({ vehicleId: created.id, url: input.imageUrl, isPrimary: true, sort: 0 });
    }
    await upsertVehiclePricing(created.id, input.pricing);
    return { id: created.id };
  },

  updateVehicle: async (id: string, input: VehicleInput): Promise<boolean> => {
    await db!
      .update(vehicles)
      .set({
        categoryId: input.categoryId,
        name: input.name,
        plate: input.plate,
        brand: input.brand ?? null,
        model: input.model ?? null,
        year: input.year ?? null,
        color: input.color ?? null,
        transmission: (input.transmission as "manual" | "automatic") ?? "manual",
        fuel: (input.fuel as "benzine" | "diesel" | "gas" | "electric") ?? "benzine",
        seats: input.seats ?? null,
        cargoKg: input.cargoKg ?? null,
        hasDriverOption: input.hasDriverOption,
        status: input.status,
      })
      .where(eq(vehicles.id, id));
    if (input.imageUrl) {
      const existing = await db!.select().from(vehicleImages).where(eq(vehicleImages.vehicleId, id)).limit(1);
      if (existing.length) await db!.update(vehicleImages).set({ url: input.imageUrl }).where(eq(vehicleImages.id, existing[0].id));
      else await db!.insert(vehicleImages).values({ vehicleId: id, url: input.imageUrl, isPrimary: true, sort: 0 });
    }
    await upsertVehiclePricing(id, input.pricing);
    return true;
  },

  setVehicleStatus: async (id: string, status: VehicleStatus): Promise<boolean> => {
    await db!.update(vehicles).set({ status }).where(eq(vehicles.id, id));
    return true;
  },

  deleteVehicle: async (id: string): Promise<{ deleted: boolean; deactivated: boolean }> => {
    const [{ count }] = await db!
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(eq(bookings.vehicleId, id));
    if (Number(count) > 0) {
      await db!.update(vehicles).set({ status: "inactive" }).where(eq(vehicles.id, id));
      return { deleted: false, deactivated: true };
    }
    await db!.delete(pricingRules).where(and(eq(pricingRules.scope, "vehicle"), eq(pricingRules.targetId, id)));
    await db!.delete(vehicles).where(eq(vehicles.id, id));
    return { deleted: true, deactivated: false };
  },

  // ---------- admin: categories ----------
  createCategory: async (input: CategoryInput): Promise<{ id: string }> => {
    const [created] = await db!
      .insert(vehicleCategories)
      .values({
        kind: input.kind, name: input.name, sort: input.sort ?? 0,
        sizeCode: input.sizeCode ?? null, capacityKg: input.capacityKg ?? null, dims: input.dims ?? null,
        description: input.description ?? null, image: input.image ?? null,
        baseFare: input.baseFare ?? 0, perKm: input.perKm ?? 0,
      })
      .returning({ id: vehicleCategories.id });
    return { id: created.id };
  },
  updateCategory: async (id: string, input: CategoryInput): Promise<boolean> => {
    await db!.update(vehicleCategories).set({
      kind: input.kind, name: input.name,
      ...(input.sort != null ? { sort: input.sort } : {}),
      ...(input.sizeCode !== undefined ? { sizeCode: input.sizeCode } : {}),
      ...(input.capacityKg !== undefined ? { capacityKg: input.capacityKg } : {}),
      ...(input.dims !== undefined ? { dims: input.dims } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.image !== undefined ? { image: input.image } : {}),
      ...(input.baseFare !== undefined ? { baseFare: input.baseFare } : {}),
      ...(input.perKm !== undefined ? { perKm: input.perKm } : {}),
    }).where(eq(vehicleCategories.id, id));
    return true;
  },
  deleteCategory: async (id: string): Promise<{ ok: boolean; reason?: string }> => {
    const [{ count }] = await db!.select({ count: sql<number>`count(*)::int` }).from(vehicles).where(eq(vehicles.categoryId, id));
    if (Number(count) > 0) return { ok: false, reason: "IN_USE" };
    await db!.delete(vehicleCategories).where(eq(vehicleCategories.id, id));
    return { ok: true };
  },

  updateBranch: async (input: Partial<BranchDTO>): Promise<boolean> => {
    const [b] = await db!.select().from(branches).where(eq(branches.active, true)).limit(1);
    await db!
      .update(branches)
      .set({
        ...(input.name != null ? { name: input.name } : {}),
        ...(input.address != null ? { address: input.address } : {}),
        ...(input.lat != null ? { lat: input.lat } : {}),
        ...(input.lng != null ? { lng: input.lng } : {}),
        ...(input.working != null ? { workingHours: input.working } : {}),
      })
      .where(eq(branches.id, input.id ?? b.id));
    return true;
  },

  // ---------- vehicle availability blocks ----------
  listVehicleBlocks: async (vehicleId: string): Promise<BlockDTO[]> => {
    const rows = await db!
      .select()
      .from(vehicleBlocks)
      .where(eq(vehicleBlocks.vehicleId, vehicleId))
      .orderBy(vehicleBlocks.startsAt);
    return rows.map((r) => ({
      id: r.id,
      vehicleId: r.vehicleId,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      reason: r.reason,
      note: r.note,
    }));
  },
  createVehicleBlock: async (input: BlockInput): Promise<{ id: string }> => {
    try {
      const [created] = await db!
        .insert(vehicleBlocks)
        .values({
          vehicleId: input.vehicleId,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          reason: input.reason,
          note: input.note ?? null,
        })
        .returning({ id: vehicleBlocks.id });
      return { id: created.id };
    } catch (e) {
      const msg = (e as Error).message ?? "";
      if (msg.includes("BLOCK_OVER_BOOKING")) throw new Error("BLOCK_OVER_BOOKING");
      throw e;
    }
  },
  deleteVehicleBlock: async (id: string): Promise<boolean> => {
    await db!.delete(vehicleBlocks).where(eq(vehicleBlocks.id, id));
    return true;
  },

  // ---------- staff / employees ----------
  listStaff: async (): Promise<StaffDTO[]> => {
    const rows = await db!.select().from(users).where(sql`${users.role} <> 'customer'`).orderBy(users.createdAt);
    return rows.map((u) => ({ id: u.id, name: u.name ?? "", phone: u.phone, role: u.role as StaffRole }));
  },
  createStaff: async (input: StaffInput): Promise<{ id: string }> => {
    const [created] = await db!
      .insert(users)
      .values({ name: input.name, phone: input.phone, role: input.role })
      .returning({ id: users.id });
    return { id: created.id };
  },
  updateStaffRole: async (id: string, role: StaffRole): Promise<boolean> => {
    await db!.update(users).set({ role }).where(eq(users.id, id));
    return true;
  },
  deleteStaff: async (id: string): Promise<boolean> => {
    await db!.delete(users).where(eq(users.id, id));
    return true;
  },
  listDrivers: async (): Promise<StaffDTO[]> => {
    const rows = await db!.select().from(users).where(eq(users.role, "driver")).orderBy(users.createdAt);
    return rows.map((u) => ({ id: u.id, name: u.name ?? "", phone: u.phone, role: "driver" as StaffRole }));
  },
  /** Resolve a staff member by their login phone (used to identify a driver). */
  getStaffByPhone: async (phone: string): Promise<StaffDTO | null> => {
    const [u] = await db!
      .select()
      .from(users)
      .where(and(eq(users.phone, phone), sql`${users.role} <> 'customer'`))
      .limit(1);
    return u ? { id: u.id, name: u.name ?? "", phone: u.phone, role: u.role as StaffRole } : null;
  },
  /** All trips assigned to a driver, soonest first. */
  listBookingsByDriver: async (driverId: string): Promise<BookingDTO[]> => {
    const rows = await db!
      .select({ bk: bookings, v: vehicles, b: branches })
      .from(bookings)
      .innerJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
      .innerJoin(branches, eq(bookings.branchId, branches.id))
      .where(eq(bookings.driverId, driverId))
      .orderBy(bookings.startsAt);
    return rows.map((r) => ({
      code: r.bk.code,
      vehicleId: r.v.id,
      vehicleName: r.v.name,
      primaryImage: null,
      branchName: r.b.name,
      startsAt: r.bk.startsAt,
      endsAt: r.bk.endsAt,
      hours: Math.round((r.bk.endsAt.getTime() - r.bk.startsAt.getTime()) / 3600000),
      status: r.bk.status,
      withDriver: r.bk.withDriver,
      delivery: r.bk.delivery,
      loaders: r.bk.loaders,
      driverId: r.bk.driverId,
      driverName: null,
      source: r.bk.source,
      agentName: r.bk.agentName,
      priceSnapshot: r.bk.priceSnapshot as Quote,
      contactName: r.bk.contactName,
      contactPhone: r.bk.contactPhone,
    }));
  },

  // ---------- booking lifecycle ----------
  adminUpdateBookingStatus: async (code: string, status: BookingDTO["status"]): Promise<boolean> => {
    const res = await db!.update(bookings).set({ status }).where(eq(bookings.code, code)).returning({ id: bookings.id });
    return res.length > 0;
  },
  adminAssignDriver: async (code: string, driverId: string | null): Promise<boolean> => {
    const res = await db!.update(bookings).set({ driverId }).where(eq(bookings.code, code)).returning({ id: bookings.id });
    return res.length > 0;
  },

  // ---------- payments ----------
  listPayments: async (bookingCode: string): Promise<PaymentDTO[]> => {
    const rows = await db!
      .select({ p: payments })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(eq(bookings.code, bookingCode))
      .orderBy(payments.createdAt);
    return rows.map((r) => ({
      id: r.p.id,
      bookingCode,
      method: r.p.method,
      kind: r.p.kind,
      amount: r.p.amountPiastres,
      status: r.p.status,
      note: r.p.note,
      createdAt: r.p.createdAt,
    }));
  },
  addPayment: async (input: PaymentInput): Promise<{ id: string }> => {
    const [b] = await db!.select({ id: bookings.id }).from(bookings).where(eq(bookings.code, input.bookingCode)).limit(1);
    if (!b) throw new Error("BOOKING_NOT_FOUND");
    const [created] = await db!
      .insert(payments)
      .values({ bookingId: b.id, method: input.method, kind: input.kind, amountPiastres: input.amount, note: input.note ?? null })
      .returning({ id: payments.id });
    return { id: created.id };
  },
  listAllPayments: async (): Promise<{ amount: number; kind: "rent" | "deposit"; status: "paid" | "refunded"; createdAt: Date }[]> => {
    const rows = await db!
      .select({ amount: payments.amountPiastres, kind: payments.kind, status: payments.status, createdAt: payments.createdAt })
      .from(payments);
    return rows.map((r) => ({ amount: r.amount, kind: r.kind, status: r.status, createdAt: r.createdAt }));
  },
  listAllPaymentsFull: async (): Promise<PaymentDTO[]> => {
    const rows = await db!
      .select({ p: payments, code: bookings.code })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .orderBy(payments.createdAt);
    return rows.map((r) => ({
      id: r.p.id,
      bookingCode: r.code,
      method: r.p.method,
      kind: r.p.kind,
      amount: r.p.amountPiastres,
      status: r.p.status,
      note: r.p.note,
      createdAt: r.p.createdAt,
    }));
  },
  refundPayment: async (id: string): Promise<boolean> => {
    await db!.update(payments).set({ status: "refunded" }).where(eq(payments.id, id));
    return true;
  },
  deletePayment: async (id: string): Promise<boolean> => {
    await db!.delete(payments).where(eq(payments.id, id));
    return true;
  },

  // ---------- documents ----------
  listDocuments: async (phone: string): Promise<DocumentDTO[]> => {
    const rows = await db!.select().from(documents).where(eq(documents.phone, phone)).orderBy(desc(documents.createdAt));
    return rows.map((d) => ({ id: d.id, phone: d.phone, type: d.type, url: d.url, expiry: d.expiry, createdAt: d.createdAt }));
  },
  saveDocument: async (input: DocumentInput): Promise<{ id: string }> => {
    await db!.delete(documents).where(and(eq(documents.phone, input.phone), eq(documents.type, input.type)));
    const [created] = await db!
      .insert(documents)
      .values({ phone: input.phone, type: input.type, url: input.url, expiry: input.expiry ?? null })
      .returning({ id: documents.id });
    return { id: created.id };
  },
  deleteDocument: async (id: string): Promise<boolean> => {
    await db!.delete(documents).where(eq(documents.id, id));
    return true;
  },
};

async function upsertVehiclePricing(vehicleId: string, p: VehiclePricingInput): Promise<void> {
  const business = await pgRepo.getBusiness();
  const tiers = [
    { hours: 1, price: p.hour1 },
    { hours: 2, price: p.hour2 },
    { hours: 4, price: p.hour4 },
    { hours: 8, price: p.hour8 },
  ].filter((t) => t.price > 0);
  const [existing] = await db!
    .select()
    .from(pricingRules)
    .where(and(eq(pricingRules.scope, "vehicle"), eq(pricingRules.targetId, vehicleId)))
    .limit(1);
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
    await db!.update(pricingRules).set(fields).where(eq(pricingRules.id, existing.id));
  } else {
    await db!.insert(pricingRules).values({ scope: "vehicle", targetId: vehicleId, ...fields });
  }
}

export const repo = hasDb ? pgRepo : memRepo;
