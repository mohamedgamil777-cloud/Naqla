/**
 * سجل النشاط: record what a staff member did in the admin, for the owner (admin → سجل النشاط).
 * Call `audit()` after an action succeeded. It never throws: a failed log line must not undo or
 * break the action itself (it is reported to the server log instead).
 *
 * Stored in audit_logs: actor_id (the staff user, null = owner via passcode), action (see
 * lib/audit-catalog), entity + entity_id (what it was done to), before/after (only the fields that
 * changed). `after._label` is a readable name for the record and `after._by` the actor's name at
 * that moment, so the log stays readable if the record or staff member is deleted later.
 */
import "server-only";
import { insertAuditLog } from "@/db/lib/audit";
import { getAdminActor } from "@/services/admin-auth";
import type { AuditAction } from "@/lib/audit-catalog";

type Fields = Record<string, unknown>;

export type AuditEntry = {
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  /** readable name of the record, e.g. the order code or the car name */
  label?: string | null;
  before?: Fields | null;
  after?: Fields | null;
};

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const actor = await getAdminActor();
    await insertAuditLog({
      actorId: actor.id,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      before: entry.before && Object.keys(entry.before).length ? clean(entry.before) : null,
      after: { ...(entry.after ? clean(entry.after) : {}), _label: entry.label ?? null, _by: actor.name },
    });
  } catch (error) {
    console.error("[audit] could not record", entry.action, error);
  }
}

const LONG = 200;

/** Big values (photos, long texts) are not copied into the log — only that they were set. */
function clean(fields: Fields): Fields {
  const out: Fields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    out[k] = typeof v === "string" && v.length > LONG ? "(اتغيّر)" : v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

/** One level of nesting is flattened ("pricing.hour1") so prices inside a group show field by field. */
function flatten(obj: Fields, prefix = ""): Fields {
  const out: Fields = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) && !prefix) {
      Object.assign(out, flatten(v as Fields, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

function same(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => (v === undefined || v === "" ? null : v instanceof Date ? v.toISOString() : v);
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

/**
 * The fields of `next` whose value differs from `prev` (only keys present in `next` are compared).
 * Returns empty objects when nothing changed.
 */
export function changes(prev: object | null | undefined, next: object): { before: Fields; after: Fields } {
  const p = flatten((prev ?? {}) as Fields);
  const n = flatten(next as Fields);
  const before: Fields = {};
  const after: Fields = {};
  for (const [k, v] of Object.entries(n)) {
    if (v === undefined || k === "id") continue;
    if (!same(p[k], v)) {
      before[k] = p[k] ?? null;
      after[k] = v;
    }
  }
  return { before, after };
}
