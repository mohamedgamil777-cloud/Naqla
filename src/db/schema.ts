/**
 * Drizzle schema — the typed query surface. The authoritative DDL (extensions,
 * the generated `period` column, and the EXCLUDE no-overlap constraint) lives in
 * migrations/0001_init.sql and must stay in sync with these definitions.
 *
 * Money columns are integer piastres. Timestamps are timestamptz.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  real,
} from "drizzle-orm/pg-core";
import {
  VEHICLE_KINDS,
  VEHICLE_STATUSES,
  BOOKING_STATUSES,
} from "@/lib/constants";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(), // E.164
    name: text("name"),
    role: text("role", {
      enum: ["customer", "super_admin", "fleet_mgr", "agent", "driver", "finance"],
    })
      .notNull()
      .default("customer"),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_phone_uq").on(t.phone)]
);

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nationalId: text("national_id"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  ...timestamps,
});

export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  lat: real("lat"),
  lng: real("lng"),
  /** Working hours per weekday: { "0": {open,close}, ... } Cairo hours. */
  workingHours: jsonb("working_hours").notNull().default({}),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const vehicleCategories = pgTable("vehicle_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind", { enum: VEHICLE_KINDS }).notNull(),
  name: text("name").notNull(),
  sort: integer("sort").notNull().default(0),
  ...timestamps,
});

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => vehicleCategories.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    name: text("name").notNull(),
    plate: text("plate").notNull(),
    brand: text("brand"),
    model: text("model"),
    year: integer("year"),
    color: text("color"),
    transmission: text("transmission", { enum: ["manual", "automatic"] }).default("manual"),
    fuel: text("fuel", { enum: ["benzine", "diesel", "gas", "electric"] }).default("benzine"),
    seats: integer("seats"),
    cargoKg: integer("cargo_kg"),
    hasDriverOption: boolean("has_driver_option").notNull().default(true),
    status: text("status", { enum: VEHICLE_STATUSES }).notNull().default("available"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("vehicles_plate_uq").on(t.plate),
    index("vehicles_category_idx").on(t.categoryId),
    index("vehicles_branch_idx").on(t.branchId),
  ]
);

export const vehicleImages = pgTable("vehicle_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  sort: integer("sort").notNull().default(0),
  isPrimary: boolean("is_primary").notNull().default(false),
  ...timestamps,
});

export const pricingRules = pgTable("pricing_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  scope: text("scope", { enum: ["global", "category", "vehicle"] }).notNull(),
  /** Null for global; category id or vehicle id for the others. */
  targetId: uuid("target_id"),
  /** [{hours,price}] in piastres. */
  tiers: jsonb("tiers").notNull().default([]),
  dailyPrice: integer("daily_price").notNull().default(0),
  extraHourPrice: integer("extra_hour_price").notNull().default(0),
  weekendMultiplier: real("weekend_multiplier").notNull().default(1),
  peakMultiplier: real("peak_multiplier").notNull().default(1),
  peakWindow: jsonb("peak_window"), // {from,to} | null
  holidayMultiplier: real("holiday_multiplier").notNull().default(1),
  holidayDates: jsonb("holiday_dates").notNull().default([]),
  driverFeePerHour: integer("driver_fee_per_hour").notNull().default(0),
  loaderFeePerPerson: integer("loader_fee_per_person").notNull().default(0),
  perKmPrice: integer("per_km_price").notNull().default(0),
  deliveryFee: integer("delivery_fee").notNull().default(0),
  deposit: integer("deposit").notNull().default(0),
  minHours: integer("min_hours").notNull().default(2),
  maxHours: integer("max_hours").notNull().default(336),
  bufferMinutes: integer("buffer_minutes").notNull().default(30),
  ...timestamps,
});

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    type: text("type", { enum: ["pct", "fixed"] }).notNull(),
    value: integer("value").notNull(), // pct: 0-100, fixed: piastres
    scope: text("scope", { enum: ["all", "category", "vehicle"] }).notNull().default("all"),
    targetId: uuid("target_id"),
    minValue: integer("min_value").notNull().default(0),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validTo: timestamp("valid_to", { withTimezone: true }),
    maxUses: integer("max_uses"),
    used: integer("used").notNull().default(0),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("promo_code_uq").on(t.code)]
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    customerId: uuid("customer_id").references(() => customers.id),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    driverId: uuid("driver_id"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status", { enum: BOOKING_STATUSES }).notNull().default("pending"),
    withDriver: boolean("with_driver").notNull().default(false),
    delivery: boolean("delivery").notNull().default(false),
    loaders: integer("loaders").notNull().default(0),
    source: text("source", { enum: ["customer", "agent"] }).notNull().default("customer"),
    agentName: text("agent_name"),
    deliveryAddress: jsonb("delivery_address"),
    /** Immutable snapshot of the computed quote (piastres). */
    priceSnapshot: jsonb("price_snapshot").notNull(),
    /** Customer contact captured at booking (before/without full profile). */
    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("bookings_code_uq").on(t.code),
    index("bookings_vehicle_idx").on(t.vehicleId),
    index("bookings_customer_idx").on(t.customerId),
    index("bookings_starts_idx").on(t.startsAt),
  ]
);

export const vehicleBlocks = pgTable(
  "vehicle_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason", { enum: ["maintenance", "block"] }).notNull().default("block"),
    note: text("note"),
    ...timestamps,
  },
  (t) => [index("vehicle_blocks_vehicle_idx").on(t.vehicleId)]
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("otp_phone_idx").on(t.phone)]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    method: text("method", { enum: ["cash", "card", "online"] }).notNull(),
    kind: text("kind", { enum: ["rent", "deposit"] }).notNull(),
    amountPiastres: integer("amount_piastres").notNull(),
    status: text("status", { enum: ["paid", "refunded"] }).notNull().default("paid"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_booking_idx").on(t.bookingId)]
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    type: text("type", { enum: ["national_id", "license"] }).notNull(),
    url: text("url").notNull(),
    expiry: text("expiry"), // ISO date string
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documents_phone_idx").on(t.phone)]
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  ...timestamps,
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type VehicleCategory = typeof vehicleCategories.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type PricingRuleRow = typeof pricingRules.$inferSelect;
export type PromoCode = typeof promoCodes.$inferSelect;
