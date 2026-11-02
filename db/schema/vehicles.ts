import { pgTable, uuid, text, integer, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { VEHICLE_STATUSES } from "@/lib/constants";
import { timestamps } from "./columns";
import { branches } from "./branches";
import { vehicleCategories } from "./vehicle-categories";

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
  ],
);

export const selectVehicleSchema = createSelectSchema(vehicles);
export const insertVehicleSchema = createInsertSchema(vehicles);
export const updateVehicleSchema = createUpdateSchema(vehicles);
