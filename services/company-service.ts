/**
 * B2B: company context for a login phone, account balance, and the monthly statement.
 * Charges = totals of COMPLETED orders billed to the company account; payments are what
 * admin records. Open (not yet completed) account orders count toward the credit limit.
 */
import {
  companyBalances,
  getCompany,
  getCompanyMemberByPhone,
  listCompanyPaymentsBetween,
} from "@/db/lib/companies";
import { searchDeliveryOrders } from "@/db/lib/delivery-orders";
import { cairoDateISO, cairoDateTime } from "@/lib/time";
import type { CompanyBalance } from "@/db/lib/companies";
import type { CompanyDTO, CompanyMemberDTO, CompanyPaymentDTO, DeliveryOrderDTO } from "@/types";

export interface CompanyContext {
  company: CompanyDTO;
  member: CompanyMemberDTO;
}

/** The active company this phone orders for, or null for a personal customer. */
export async function companyContext(phone: string): Promise<CompanyContext | null> {
  const member = await getCompanyMemberByPhone(phone);
  if (!member) return null;
  const company = await getCompany(member.companyId);
  if (!company || !company.active) return null;
  return { company, member };
}

/** Saved addresses are shared by the whole company, else personal. */
export function addressOwner(phone: string, ctx: CompanyContext | null): string {
  return ctx ? `c:${ctx.company.id}` : `p:${phone}`;
}

/** Personal lists are their owner's; a company's list is managed by its admin (owner) only. */
export function canEditAddresses(ctx: CompanyContext | null): boolean {
  return !ctx || ctx.member.role === "owner";
}

export type { CompanyBalance } from "@/db/lib/companies";

const EMPTY_BALANCE: CompanyBalance = { charged: 0, paid: 0, outstanding: 0, open: 0 };

/** The company's account balance, summed in the database. */
export async function companyBalance(companyId: string): Promise<CompanyBalance> {
  return (await companyBalances([companyId])).get(companyId) ?? EMPTY_BALANCE;
}

export interface CompanyStatement {
  company: CompanyDTO;
  month: string; // YYYY-MM (Cairo)
  opening: number;
  trips: DeliveryOrderDTO[]; // completed account orders in the month
  /** completed trips paid in cash to the driver (not on the bill, listed for the company's records) */
  cashTrips: DeliveryOrderDTO[];
  cashTotal: number;
  charges: number;
  payments: CompanyPaymentDTO[]; // received in the month
  paid: number;
  closing: number;
  /** all orders in the month (incl. cash / cancelled) for the company's own overview */
  allTrips: DeliveryOrderDTO[];
}

export function currentMonth(): string {
  return cairoDateISO(new Date()).slice(0, 7);
}

/** Cairo [start of month, start of next month). */
export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { start: cairoDateTime(`${month}-01`, 0), end: cairoDateTime(`${next}-01`, 0) };
}

/** Largest month of orders a statement lists (a month is the natural bound; this is a safety cap). */
const STATEMENT_MAX_ORDERS = 2000;

/**
 * One month: the opening balance is summed in the database from everything before the month;
 * only the month's own orders and payments are loaded.
 */
export async function companyStatement(companyId: string, month: string): Promise<CompanyStatement | null> {
  const company = await getCompany(companyId);
  if (!company) return null;
  const { start, end } = monthRange(month);
  const [before, monthOrders, payments] = await Promise.all([
    companyBalances([companyId], start),
    searchDeliveryOrders(
      { companyId, scheduledFrom: start, scheduledTo: end },
      1,
      STATEMENT_MAX_ORDERS,
      "upcoming",
    ),
    listCompanyPaymentsBetween(companyId, start, end),
  ]);
  const opening = before.get(companyId)?.outstanding ?? 0;
  const allTrips = monthOrders.rows;
  const trips = allTrips.filter((o) => o.billing === "account" && o.status === "completed");
  const cashTrips = allTrips.filter((o) => o.billing !== "account" && o.status === "completed");
  const charges = sum(trips);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  return {
    company,
    month,
    opening,
    trips,
    cashTrips,
    cashTotal: sum(cashTrips),
    charges,
    payments,
    paid,
    closing: opening + charges - paid,
    allTrips,
  };
}

function sum(orders: DeliveryOrderDTO[]): number {
  return orders.reduce((s, o) => s + o.priceSnapshot.total, 0);
}

/** "أكتوبر 2026" */
export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}
