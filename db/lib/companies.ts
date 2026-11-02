/** B2B companies, their members and account payments. */
import { and, desc, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { companies, companyMembers, companyPayments, deliveryOrders } from "@/db/schema";
import type { CompanyDTO, CompanyInput, CompanyMemberDTO, CompanyPaymentDTO, CompanyRole } from "@/types";
import { countAll, mapCompany } from "./shared";

export async function listCompanies(): Promise<CompanyDTO[]> {
  const rows = await db.query.companies.findMany({ orderBy: (companies) => companies.name });
  return rows.map(mapCompany);
}

export async function getCompany(id: string): Promise<CompanyDTO | null> {
  const r = await db.query.companies.findFirst({ where: (companies) => eq(companies.id, id) });
  return r ? mapCompany(r) : null;
}

export async function createCompany(input: CompanyInput): Promise<{ id: string }> {
  const [r] = await db.insert(companies).values(input).returning({ id: companies.id });
  return { id: r.id };
}

export async function updateCompany(id: string, input: CompanyInput): Promise<boolean> {
  await db.update(companies).set(input).where(eq(companies.id, id));
  return true;
}

export async function listCompanyMembers(companyId: string): Promise<CompanyMemberDTO[]> {
  const rows = await db.query.companyMembers.findMany({
    where: (companyMembers) => eq(companyMembers.companyId, companyId),
    orderBy: (companyMembers) => companyMembers.createdAt,
  });
  return rows;
}

/** The company a login phone belongs to (one company per phone). */
export async function getCompanyMemberByPhone(phone: string): Promise<CompanyMemberDTO | null> {
  const m = await db.query.companyMembers.findFirst({
    where: (companyMembers) => eq(companyMembers.phone, phone),
  });
  return m ?? null;
}

/** One company per phone: the unique index decides under concurrency, not a pre-check. */
export async function addCompanyMember(
  companyId: string,
  phone: string,
  name: string | null,
  role: CompanyRole,
): Promise<{ ok: boolean; reason?: string }> {
  const res = await db
    .insert(companyMembers)
    .values({ companyId, phone, name, role })
    .onConflictDoNothing({ target: companyMembers.phone })
    .returning({ id: companyMembers.id });
  return res.length ? { ok: true } : { ok: false, reason: "PHONE_TAKEN" };
}

/** Removes a member of THIS company only; `exceptMemberId` protects the caller (can't remove yourself). */
export async function removeCompanyMember(
  companyId: string,
  id: string,
  exceptMemberId?: string,
): Promise<boolean> {
  const res = await db
    .delete(companyMembers)
    .where(
      and(
        eq(companyMembers.id, id),
        eq(companyMembers.companyId, companyId),
        exceptMemberId ? ne(companyMembers.id, exceptMemberId) : undefined,
      ),
    )
    .returning({ id: companyMembers.id });
  return res.length > 0;
}

export async function addCompanyPayment(
  input: Omit<CompanyPaymentDTO, "id" | "createdAt">,
): Promise<{ id: string }> {
  const [r] = await db.insert(companyPayments).values(input).returning({ id: companyPayments.id });
  return { id: r.id };
}

export async function deleteCompanyPayment(companyId: string, id: string): Promise<boolean> {
  const res = await db
    .delete(companyPayments)
    .where(and(eq(companyPayments.id, id), eq(companyPayments.companyId, companyId)))
    .returning({ id: companyPayments.id });
  return res.length > 0;
}

/** A company's account payments, latest first (bounded: the statement covers the full history by month). */
export async function listCompanyPayments(companyId: string, limit = 50): Promise<CompanyPaymentDTO[]> {
  return db.query.companyPayments.findMany({
    where: (companyPayments) => eq(companyPayments.companyId, companyId),
    orderBy: (companyPayments) => desc(companyPayments.createdAt),
    limit: limit,
  });
}

/** Payments received in [start, end), oldest first (monthly statement). */
export async function listCompanyPaymentsBetween(
  companyId: string,
  start: Date,
  end: Date,
): Promise<CompanyPaymentDTO[]> {
  return db.query.companyPayments.findMany({
    where: (companyPayments) =>
      and(
        eq(companyPayments.companyId, companyId),
        gte(companyPayments.createdAt, start),
        lt(companyPayments.createdAt, end),
      ),
    orderBy: (companyPayments) => companyPayments.createdAt,
  });
}

export interface CompanyBalance {
  /** completed account orders */
  charged: number;
  paid: number;
  /** charged − paid */
  outstanding: number;
  /** account orders not finished yet (they count toward the credit limit) */
  open: number;
}

const orderTotal = sql`(${deliveryOrders.priceSnapshot}->>'total')::int`;

/**
 * Account balances per company, summed in the database. `before` limits it to activity before a
 * date (a statement's opening balance). Companies with no activity are absent (= all zero).
 */
export async function companyBalances(
  companyIds?: string[],
  before?: Date,
): Promise<Map<string, CompanyBalance>> {
  const scopeOrders = and(
    eq(deliveryOrders.billing, "account"),
    companyIds ? inArray(deliveryOrders.companyId, companyIds) : sql`${deliveryOrders.companyId} is not null`,
    before ? lt(deliveryOrders.scheduledAt, before) : undefined,
  );
  const scopePayments = and(
    companyIds ? inArray(companyPayments.companyId, companyIds) : undefined,
    before ? lt(companyPayments.createdAt, before) : undefined,
  );
  const [orders, paid] = await Promise.all([
    db
      .select({
        companyId: deliveryOrders.companyId,
        charged: sql<number>`coalesce(sum(${orderTotal}) filter (where ${deliveryOrders.status} = 'completed'), 0)::int`,
        open: sql<number>`coalesce(sum(${orderTotal}) filter (where ${deliveryOrders.status} not in ('completed', 'cancelled')), 0)::int`,
      })
      .from(deliveryOrders)
      .where(scopeOrders)
      .groupBy(deliveryOrders.companyId),
    db
      .select({
        companyId: companyPayments.companyId,
        paid: sql<number>`coalesce(sum(${companyPayments.amount}), 0)::int`,
      })
      .from(companyPayments)
      .where(scopePayments)
      .groupBy(companyPayments.companyId),
  ]);
  const out = new Map<string, CompanyBalance>();
  const get = (id: string) =>
    out.get(id) ?? out.set(id, { charged: 0, paid: 0, outstanding: 0, open: 0 }).get(id)!;
  for (const o of orders) Object.assign(get(o.companyId!), { charged: o.charged, open: o.open });
  for (const p of paid) get(p.companyId).paid = p.paid;
  for (const b of out.values()) b.outstanding = b.charged - b.paid;
  return out;
}

/** Members per company. */
export async function countCompanyMembers(): Promise<Map<string, number>> {
  const rows = await db
    .select({ companyId: companyMembers.companyId, n: countAll })
    .from(companyMembers)
    .groupBy(companyMembers.companyId);
  return new Map(rows.map((r) => [r.companyId, r.n]));
}
