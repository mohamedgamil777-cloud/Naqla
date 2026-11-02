import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

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

const auditLogJson = { before: z.unknown(), after: z.unknown() };

export const selectAuditLogSchema = createSelectSchema(auditLogs, auditLogJson);
export const insertAuditLogSchema = createInsertSchema(auditLogs, auditLogJson);
export const updateAuditLogSchema = createUpdateSchema(auditLogs, auditLogJson);
