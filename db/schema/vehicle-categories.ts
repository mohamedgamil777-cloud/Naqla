import { pgTable, uuid, text, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { VEHICLE_KINDS } from "@/lib/constants";
import { timestamps } from "./columns";

export const vehicleCategories = pgTable("vehicle_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind", { enum: VEHICLE_KINDS }).notNull(),
  name: text("name").notNull(),
  sort: integer("sort").notNull().default(0),
  sizeCode: text("size_code", { enum: ["XS", "S", "M", "L", "XL"] }),
  active: boolean("active").notNull().default(true),
  capacityKg: integer("capacity_kg"),
  dims: text("dims"),
  description: text("description"),
  image: text("image"),
  /** box volume in m³ (customer info) */
  volumeM3: real("volume_m3"),
  /** closed box / open bed / covered with a tarp */
  bodyType: text("body_type", { enum: ["closed", "open", "covered"] }),
  /** what fits, one item per line (shown to customers as a list) */
  features: text("features"),
  baseFare: integer("base_fare").notNull().default(0),
  perKm: integer("per_km").notNull().default(0),
  ...timestamps,
});

export const selectVehicleCategorySchema = createSelectSchema(vehicleCategories);
export const insertVehicleCategorySchema = createInsertSchema(vehicleCategories);
export const updateVehicleCategorySchema = createUpdateSchema(vehicleCategories);
