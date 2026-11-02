import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { timestamps } from "./columns";

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
  (t) => [index("otp_phone_idx").on(t.phone)],
);

export const selectOtpCodeSchema = createSelectSchema(otpCodes);
export const insertOtpCodeSchema = createInsertSchema(otpCodes);
export const updateOtpCodeSchema = createUpdateSchema(otpCodes);
