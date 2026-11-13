/** سجل النشاط: admin actions (table audit_logs, in the schema since 0001 — no migration needed). */
import { and, desc, eq, gte, inArray, isNull, lt, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, users } from "@/db/schema";

export type AuditRow = {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: Date;
};

export async function insertAuditLog(row: Omit<AuditRow, "id" | "createdAt">): Promise<void> {
  await db.insert(auditLogs).values(row);
}

export type AuditFilter = {
  /** a staff id, or "owner" for the shared-passcode owner (no staff record) */
  actor?: string;
  actions?: string[];
  from?: Date;
  to?: Date;
  /** order / booking code, or any text in the record label */
  q?: string;
};

export type AuditListItem = AuditRow & { actorName: string | null };

export async function searchAuditLogs(
  filter: AuditFilter,
  page: number,
  pageSize: number,
): Promise<{ rows: AuditListItem[]; page: number; totalPages: number; total: number }> {
  const where: SQL[] = [];
  if (filter.actor === "owner") where.push(isNull(auditLogs.actorId));
  else if (filter.actor) where.push(eq(auditLogs.actorId, filter.actor));
  if (filter.actions?.length) where.push(inArray(auditLogs.action, filter.actions));
  if (filter.from) where.push(gte(auditLogs.createdAt, filter.from));
  if (filter.to) where.push(lt(auditLogs.createdAt, filter.to));
  if (filter.q) {
    const like = `%${filter.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(
      sql`(${auditLogs.entityId} ILIKE ${like} OR ${auditLogs.after}->>'_label' ILIKE ${like} OR ${auditLogs.after}::text ILIKE ${like})`,
    );
  }
  const cond = where.length ? and(...where) : undefined;

  // one round trip: the page plus the total count
  const rows = await db
    .select({
      id: auditLogs.id,
      actorId: auditLogs.actorId,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      before: auditLogs.before,
      after: auditLogs.after,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
      total: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(cond)
    .orderBy(desc(auditLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = rows[0]?.total ?? 0;
  return {
    rows: rows.map(({ total: _t, ...r }) => ({
      ...r,
      before: (r.before as Record<string, unknown> | null) ?? null,
      after: (r.after as Record<string, unknown> | null) ?? null,
    })),
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    total,
  };
}
