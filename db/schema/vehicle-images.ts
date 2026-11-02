import { pgTable, uuid, text, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { timestamps } from "./columns";
import { vehicles } from "./vehicles";

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

export const selectVehicleImageSchema = createSelectSchema(vehicleImages);
export const insertVehicleImageSchema = createInsertSchema(vehicleImages);
export const updateVehicleImageSchema = createUpdateSchema(vehicleImages);
