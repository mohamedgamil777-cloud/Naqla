import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { timestamps } from "./columns";
import { vehicles } from "./vehicles";

export const vehicleBlocks = pgTable(
  "vehicle_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason", { enum: ["maintenance", "block"] })
      .notNull()
      .default("block"),
    note: text("note"),
    ...timestamps,
  },
  (t) => [index("vehicle_blocks_vehicle_idx").on(t.vehicleId)],
);

export const selectVehicleBlockSchema = createSelectSchema(vehicleBlocks);
export const insertVehicleBlockSchema = createInsertSchema(vehicleBlocks);
export const updateVehicleBlockSchema = createUpdateSchema(vehicleBlocks);
