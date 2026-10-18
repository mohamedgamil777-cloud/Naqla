/**
 * B2B: company context for a login phone, account balance, and the monthly statement.
 * Charges = totals of COMPLETED orders billed to the company account; payments are what
 * admin records. Open (not yet completed) account orders count toward the credit limit.
 */
import { repo } from "@/data/repo";
import { cairoDateISO } from "@/lib/time";
import type { CompanyDTO, CompanyMemberDTO, CompanyPaymentDTO, DeliveryOrderDTO } from "@/data/types";

export interface CompanyContext {
  company: CompanyDTO;
  member: CompanyMemberDTO;
}

/** The active company this phone orders for, or null for a personal customer. */
export async function companyContext(phone: string): Promise<CompanyContext | null> {
  const member = await repo.getCompanyMemberByPhone(phone);
  if (!member) return null;
  const company = await repo.getCompany(member.companyId);
  if (!company || !company.active) return null;
  return { company, member };
}

/** Saved addresses are shared by the whole company, else personal. */
export function addressOwner(phone: string, ctx: CompanyContext | null): string {
  return ctx ? `c:${ctx.company.id}` : `p:${phone}`;
}

export interface CompanyBalance {
  charged: number; // completed account orders
  paid: number;
  outstanding: number; // charged − paid
  open: number; // account orders not yet completed (count toward the credit limit)
}

export async function companyBalance(companyId: string): Promise<CompanyBalance> {
  const [orders, payments] = await Promise.all([repo.listDeliveryOrdersByCompany(companyId), repo.listCompanyPayments(companyId)]);
  const acct = orders.filter((o) => o.billing === "account");
  const charged = sum(acct.filter((o) => o.status === "completed"));
  const open = sum(acct.filter((o) => o.status !== "completed" && o.status !== "cancelled"));
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  return { charged, paid, outstanding: charged - paid, open };
}

export interface CompanyStatement {
  company: CompanyDTO;
  month: string; // YYYY-MM (Cairo)
  opening: number;
  trips: DeliveryOrderDTO[]; // completed account orders in the month
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

export async function companyStatement(companyId: string, month: string): Promise<CompanyStatement | null> {
  const company = await repo.getCompany(companyId);
  if (!company) return null;
  const [orders, payments] = await Promise.all([repo.listDeliveryOrdersByCompany(companyId), repo.listCompanyPayments(companyId)]);
  const monthOf = (d: Date) => cairoDateISO(d).slice(0, 7);
  const charged = orders.filter((o) => o.billing === "account" && o.status === "completed");

  const before = (d: Date) => monthOf(d) < month;
  const opening = sum(charged.filter((o) => before(o.scheduledAt))) - payments.filter((p) => before(p.createdAt)).reduce((s, p) => s + p.amount, 0);
  const trips = charged.filter((o) => monthOf(o.scheduledAt) === month).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  const monthPayments = payments.filter((p) => monthOf(p.createdAt) === month).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const charges = sum(trips);
  const paid = monthPayments.reduce((s, p) => s + p.amount, 0);
  const allTrips = orders.filter((o) => monthOf(o.scheduledAt) === month).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  return { company, month, opening, trips, charges, payments: monthPayments, paid, closing: opening + charges - paid, allTrips };
}

function sum(orders: DeliveryOrderDTO[]): number {
  return orders.reduce((s, o) => s + o.priceSnapshot.total, 0);
}

/** "أكتوبر 2026" */
export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
}
