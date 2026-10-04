/**
 * Finance service — computes the accountant's reports from bookings + payments.
 * Money is in piastres; format at the edge. Date basis:
 *  - per-trip report / summary / revenue-by-vehicle: bookings by TRIP date (startsAt)
 *  - cashflow / by-method: payments by COLLECTION date (createdAt)
 */
import { repo } from "@/data/repo";
import { cairoDateISO, labelDateArabic } from "@/lib/time";
import type { BookingStatus } from "@/lib/constants";

export interface FinanceRow {
  code: string;
  dateISO: string;
  dateLabel: string;
  vehicle: string;
  customer: string;
  phone: string;
  status: BookingStatus;
  source: "customer" | "agent";
  agentName: string | null;
  total: number; // due (piastres)
  paid: number;
  remaining: number;
  depositHeld: number;
  depositRefunded: number;
}

export interface CashflowRow {
  dateISO: string;
  dateLabel: string;
  rentIn: number;
  depositIn: number;
  depositOut: number;
  net: number;
}

export interface FinanceReport {
  from: string;
  to: string;
  summary: {
    trips: number;
    totalDue: number;
    totalPaid: number;
    totalRemaining: number;
    depositsHeld: number;
    depositsRefunded: number;
    avgTrip: number;
  };
  rows: FinanceRow[];
  cashflow: CashflowRow[];
  byVehicle: { name: string; trips: number; collected: number }[];
  byMethod: { cash: number; card: number; online: number };
}

const inRange = (d: string, from: string, to: string) => d >= from && d <= to;

export async function getFinance(from: string, to: string): Promise<FinanceReport> {
  const [bookings, payments] = await Promise.all([repo.listAllBookings(), repo.listAllPaymentsFull()]);

  // Index payments by booking code.
  const byCode = new Map<string, typeof payments>();
  for (const p of payments) {
    const arr = byCode.get(p.bookingCode) ?? [];
    arr.push(p);
    byCode.set(p.bookingCode, arr);
  }

  // ---- per-trip rows (trips whose pickup date is in range) ----
  const rows: FinanceRow[] = [];
  for (const b of bookings) {
    const dISO = cairoDateISO(b.startsAt);
    if (!inRange(dISO, from, to)) continue;
    const ps = byCode.get(b.code) ?? [];
    const paid = ps.filter((p) => p.kind === "rent" && p.status === "paid").reduce((s, p) => s + p.amount, 0);
    const depositHeld = ps.filter((p) => p.kind === "deposit" && p.status === "paid").reduce((s, p) => s + p.amount, 0);
    const depositRefunded = ps.filter((p) => p.kind === "deposit" && p.status === "refunded").reduce((s, p) => s + p.amount, 0);
    const due = b.status === "cancelled" ? 0 : b.priceSnapshot.total;
    rows.push({
      code: b.code,
      dateISO: dISO,
      dateLabel: labelDateArabic(b.startsAt),
      vehicle: b.vehicleName,
      customer: b.contactName ?? "-",
      phone: b.contactPhone ?? "-",
      status: b.status,
      source: b.source,
      agentName: b.agentName,
      total: due,
      paid,
      remaining: Math.max(0, due - paid),
      depositHeld,
      depositRefunded,
    });
  }
  rows.sort((a, b) => (a.dateISO < b.dateISO ? -1 : a.dateISO > b.dateISO ? 1 : 0));

  const summary = {
    trips: rows.length,
    totalDue: rows.reduce((s, r) => s + r.total, 0),
    totalPaid: rows.reduce((s, r) => s + r.paid, 0),
    totalRemaining: rows.reduce((s, r) => s + r.remaining, 0),
    depositsHeld: rows.reduce((s, r) => s + r.depositHeld, 0),
    depositsRefunded: rows.reduce((s, r) => s + r.depositRefunded, 0),
    avgTrip: rows.length ? Math.round(rows.reduce((s, r) => s + r.total, 0) / rows.length) : 0,
  };

  // ---- revenue by vehicle (collected) ----
  const vehMap = new Map<string, { trips: number; collected: number }>();
  for (const r of rows) {
    const v = vehMap.get(r.vehicle) ?? { trips: 0, collected: 0 };
    v.trips += 1;
    v.collected += r.paid;
    vehMap.set(r.vehicle, v);
  }
  const byVehicle = [...vehMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.collected - a.collected);

  // ---- cashflow + by-method (payments collected in range) ----
  const cashMap = new Map<string, CashflowRow>();
  const byMethod = { cash: 0, card: 0, online: 0 };
  for (const p of payments) {
    const dISO = cairoDateISO(p.createdAt);
    if (!inRange(dISO, from, to)) continue;
    const row = cashMap.get(dISO) ?? { dateISO: dISO, dateLabel: labelDateArabic(p.createdAt), rentIn: 0, depositIn: 0, depositOut: 0, net: 0 };
    if (p.kind === "rent" && p.status === "paid") {
      row.rentIn += p.amount;
      byMethod[p.method] += p.amount;
    } else if (p.kind === "deposit" && p.status === "paid") {
      row.depositIn += p.amount;
    } else if (p.kind === "deposit" && p.status === "refunded") {
      row.depositOut += p.amount;
    }
    row.net = row.rentIn + row.depositIn - row.depositOut;
    cashMap.set(dISO, row);
  }
  const cashflow = [...cashMap.values()].sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));

  return { from, to, summary, rows, cashflow, byVehicle, byMethod };
}
