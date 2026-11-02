import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { timestamps } from "./columns";

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
    nationalId: text("national_id"),
    photo: text("photo"),
    drivingLicense: text("driving_license"),
    vehicleLicense: text("vehicle_license"),
    available: boolean("available").notNull().default(true),
    // phone + password login (0015). OTP comes back later as a second factor.
    passwordHash: text("password_hash"),
    passwordSetAt: timestamp("password_set_at", { withTimezone: true }),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    /** set when an agent has confirmed the number by phone (staff: when an admin added them) */
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_phone_uq").on(t.phone)],
);

export const selectUserSchema = createSelectSchema(users);
export const insertUserSchema = createInsertSchema(users);
export const updateUserSchema = createUpdateSchema(users);
