/**
 * Finance service — computes the accountant's reports from delivery orders, (legacy hourly)
 * bookings + payments. Money is in piastres; format at the edge. Date basis:
 *  - per-order / per-trip reports, summaries, by-vehicle / by-driver: by TRIP date (scheduledAt / startsAt)
 *  - cashflow / by-method: by COLLECTION date (payment createdAt, order cashReceivedAt)
 */
import { repo } from "@/data/repo";
import { cairoDateISO, labelDateArabic } from "@/lib/time";
import type { BookingStatus } from "@/lib/constants";
import type { DeliveryOrderStatus, OrderBilling, OrderSource } from "@/data/types";

/** One delivery order. Revenue counts only once it's delivered (completed). */
export interface DeliveryFinanceRow {
  code: string;
  dateISO: string;
  dateLabel: string;
  size: string;
  customer: string;
  phone: string;
  company: string | null;
  status: DeliveryOrderStatus;
  billing: OrderBilling;
  source: OrderSource;
  agentName: string | null;
  driver: string | null;
  total: number; // earned (completed) — 0 otherwise
  open: number; // value of orders not delivered yet (not cancelled)
  cashReceived: number; // handed in by the driver
  cashPending: number; // completed cash order, still with the driver (or short)
  onAccount: number; // completed account order → company statement
}

export interface DeliveryFinance {
  summary: {
    completed: number;
    cancelled: number;
    earned: number;
    open: number;
    cashReceived: number;
    cashPending: number;
    onAccount: number;
    avgOrder: number;
  };
  rows: DeliveryFinanceRow[];
  byDriver: { name: string; orders: number; earned: number; cashReceived: number; cashPending: number }[];
  bySize: { name: string; orders: number; earned: number }[];
}

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
  deliveryIn: number; // cash handed in for delivery orders
  rentIn: number;
  depositIn: number;
  depositOut: number;
  net: number;
}

export interface FinanceReport {
  from: string;
  to: string;
  deliveries: DeliveryFinance;
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
  const [bookings, payments, orders, companies] = await Promise.all([
    repo.listAllBookings(),
    repo.listAllPaymentsFull(),
    repo.listDeliveryOrders(),
    repo.listCompanies(),
  ]);
  const companyName = new Map(companies.map((c) => [c.id, c.name]));

  // ---- delivery orders (orders whose scheduled day is in range) ----
  const dRows: DeliveryFinanceRow[] = [];
  for (const o of orders) {
    const dISO = cairoDateISO(o.scheduledAt);
    if (!inRange(dISO, from, to)) continue;
    const done = o.status === "completed";
    const total = done ? o.priceSnapshot.total : 0;
    const cashReceived = done && o.billing === "cash" ? o.cashReceived ?? 0 : 0;
    dRows.push({
      code: o.code,
      dateISO: dISO,
      dateLabel: labelDateArabic(o.scheduledAt),
      size: o.sizeName,
      customer: o.contactName ?? "-",
      phone: o.contactPhone ?? "-",
      company: o.companyId ? companyName.get(o.companyId) ?? "شركة" : null,
      status: o.status,
      billing: o.billing,
      source: o.source,
      agentName: o.agentName,
      driver: o.driverName,
      total,
      open: !done && o.status !== "cancelled" ? o.priceSnapshot.total : 0,
      cashReceived,
      cashPending: done && o.billing === "cash" ? Math.max(0, total - cashReceived) : 0,
      onAccount: done && o.billing === "account" ? total : 0,
    });
  }
  dRows.sort((a, b) => (a.dateISO < b.dateISO ? -1 : a.dateISO > b.dateISO ? 1 : 0));
  const sum = (k: "total" | "open" | "cashReceived" | "cashPending" | "onAccount") => dRows.reduce((s, r) => s + r[k], 0);
  const completed = dRows.filter((r) => r.status === "completed").length;

  const drvMap = new Map<string, { orders: number; earned: number; cashReceived: number; cashPending: number }>();
  const sizeMap = new Map<string, { orders: number; earned: number }>();
  for (const r of dRows) {
    if (r.status !== "completed") continue;
    const dk = r.driver ?? "بدون سائق";
    const d = drvMap.get(dk) ?? { orders: 0, earned: 0, cashReceived: 0, cashPending: 0 };
    d.orders += 1;
    d.earned += r.total;
    d.cashReceived += r.cashReceived;
    d.cashPending += r.cashPending;
    drvMap.set(dk, d);
    const sz = sizeMap.get(r.size) ?? { orders: 0, earned: 0 };
    sz.orders += 1;
    sz.earned += r.total;
    sizeMap.set(r.size, sz);
  }
  const deliveries: DeliveryFinance = {
    summary: {
      completed,
      cancelled: dRows.filter((r) => r.status === "cancelled").length,
      earned: sum("total"),
      open: sum("open"),
      cashReceived: sum("cashReceived"),
      cashPending: sum("cashPending"),
      onAccount: sum("onAccount"),
      avgOrder: completed ? Math.round(sum("total") / completed) : 0,
    },
    rows: dRows,
    byDriver: [...drvMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.earned - a.earned),
    bySize: [...sizeMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.earned - a.earned),
  };

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

  // ---- cashflow + by-method (money collected in range) ----
  const cashMap = new Map<string, CashflowRow>();
  const byMethod = { cash: 0, card: 0, online: 0 };
  const dayRow = (d: Date): CashflowRow => {
    const dISO = cairoDateISO(d);
    return cashMap.get(dISO) ?? { dateISO: dISO, dateLabel: labelDateArabic(d), deliveryIn: 0, rentIn: 0, depositIn: 0, depositOut: 0, net: 0 };
  };
  for (const o of orders) {
    if (o.cashReceived == null || !o.cashReceivedAt || !inRange(cairoDateISO(o.cashReceivedAt), from, to)) continue;
    const row = dayRow(o.cashReceivedAt);
    row.deliveryIn += o.cashReceived;
    row.net = row.deliveryIn + row.rentIn + row.depositIn - row.depositOut;
    cashMap.set(row.dateISO, row);
  }
  for (const p of payments) {
    const dISO = cairoDateISO(p.createdAt);
    if (!inRange(dISO, from, to)) continue;
    const row = dayRow(p.createdAt);
    if (p.kind === "rent" && p.status === "paid") {
      row.rentIn += p.amount;
      byMethod[p.method] += p.amount;
    } else if (p.kind === "deposit" && p.status === "paid") {
      row.depositIn += p.amount;
    } else if (p.kind === "deposit" && p.status === "refunded") {
      row.depositOut += p.amount;
    }
    row.net = row.deliveryIn + row.rentIn + row.depositIn - row.depositOut;
    cashMap.set(dISO, row);
  }
  const cashflow = [...cashMap.values()].sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));

  return { from, to, deliveries, summary, rows, cashflow, byVehicle, byMethod };
}
