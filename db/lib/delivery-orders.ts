/** A→B delivery orders: creation, lists, the order lifecycle and aggregates. */
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { deliveryOrders } from "@/db/schema";
import type { Quote } from "@/engines/pricing";
import { newBookingCode } from "@/lib/constants";
import type {
  DeliveryOrderDTO,
  DeliveryOrderFilter,
  DeliveryOrderInput,
  DeliveryOrderSort,
  DeliveryOrderStatus,
  Page,
} from "@/types";
import { countAll, likeTerm, toPage, orderWith, mapDeliveryOrder } from "./shared";
import { redeemPromo } from "./coupons";

/**
 * Inserts the order (phone orders start confirmed) and counts the coupon use in one transaction.
 * `sizeName` is the historical size snapshot stored with the price.
 */
export async function insertDeliveryOrder(
  input: DeliveryOrderInput,
  quote: Quote,
  sizeName: string,
  sizeCode: string | null,
  redeemPromoCode: string | null,
): Promise<{ code: string }> {
  const code = newBookingCode();
  await db.transaction(async (tx) => {
    await tx.insert(deliveryOrders).values({
      code,
      categoryId: input.categoryId,
      sizeName,
      sizeCode,
      pickupAddress: input.pickupAddress ?? null,
      dropoffAddress: input.dropoffAddress ?? null,
      pickupDetails: input.pickupDetails ?? null,
      dropoffDetails: input.dropoffDetails ?? null,
      cargoType: input.cargoType ?? null,
      notes: input.notes ?? null,
      pickupLat: input.pickupLat ?? null,
      pickupLng: input.pickupLng ?? null,
      dropoffLat: input.dropoffLat ?? null,
      dropoffLng: input.dropoffLng ?? null,
      km: input.km,
      loaders: input.loaders,
      scheduledAt: input.scheduledAt,
      priceSnapshot: quote,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      companyId: input.companyId ?? null,
      billing: input.billing ?? "cash",
      source: input.source ?? "customer",
      agentName: input.agentName ?? null,
      status: input.source === "agent" ? "confirmed" : "new",
    });
    if (redeemPromoCode) await redeemPromo(tx, redeemPromoCode);
  });
  return { code };
}

export const OPEN_ORDER_STATUSES: DeliveryOrderStatus[] = [
  "new",
  "confirmed",
  "assigned",
  "en_route",
  "arrived",
];
export const CLOSED_ORDER_STATUSES: DeliveryOrderStatus[] = ["completed", "cancelled"];

type OrderColumns = typeof deliveryOrders._.columns;

/**
 * The WHERE clause for an order filter (scope first: phone / driver / company). Takes the columns so
 * it serves both `db.query` callbacks and the count query.
 */
function orderWhere(filter: DeliveryOrderFilter, o: OrderColumns): SQL | undefined {
  const conds: SQL[] = [];
  if (filter.phone) conds.push(eq(o.contactPhone, filter.phone));
  if (filter.driverId) conds.push(eq(o.driverId, filter.driverId));
  if (filter.companyId) conds.push(eq(o.companyId, filter.companyId));
  if (filter.billing) conds.push(eq(o.billing, filter.billing));
  if (filter.unrated) conds.push(isNull(o.rating));
  if (filter.status === "open") conds.push(inArray(o.status, OPEN_ORDER_STATUSES));
  else if (filter.status === "closed") conds.push(inArray(o.status, CLOSED_ORDER_STATUSES));
  else if (filter.status) conds.push(eq(o.status, filter.status));
  if (filter.statuses?.length) conds.push(inArray(o.status, filter.statuses));
  if (filter.scheduledFrom) conds.push(gte(o.scheduledAt, filter.scheduledFrom));
  if (filter.scheduledTo) conds.push(lt(o.scheduledAt, filter.scheduledTo));
  const term = filter.q?.trim();
  if (term) {
    const like = likeTerm(term);
    conds.push(
      or(
        ilike(o.code, like),
        ilike(o.contactName, like),
        ilike(o.contactPhone, like),
        ilike(o.pickupAddress, like),
        ilike(o.dropoffAddress, like),
      )!,
    );
  }
  return conds.length ? and(...conds) : undefined;
}

const ORDER_SORT: Record<DeliveryOrderSort, (o: OrderColumns) => SQL[]> = {
  newest: (o) => [desc(o.createdAt), asc(o.id)],
  upcoming: (o) => [asc(o.scheduledAt), asc(o.id)],
  recent: (o) => [desc(o.scheduledAt), asc(o.id)],
};

/** Any order list (admin, customer, driver, company): filtered, sorted and paginated in the database. */
export async function searchDeliveryOrders(
  filter: DeliveryOrderFilter,
  page: number,
  pageSize: number,
  sort: DeliveryOrderSort = "newest",
): Promise<Page<DeliveryOrderDTO>> {
  const [{ count }] = await db
    .select({ count: countAll })
    .from(deliveryOrders)
    .where(orderWhere(filter, deliveryOrders));
  const rows = await db.query.deliveryOrders.findMany({
    where: (deliveryOrders) => orderWhere(filter, deliveryOrders),
    with: orderWith,
    orderBy: (deliveryOrders) => ORDER_SORT[sort](deliveryOrders),
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return toPage(rows.map(mapDeliveryOrder), count, page, pageSize);
}

/**
 * Orders still in progress for one scope (a driver's work, a customer's live orders), soonest
 * first. Capped: in-progress orders are few by nature; finished ones go through searchDeliveryOrders.
 */
export async function listOpenDeliveryOrders(
  filter: DeliveryOrderFilter & { statuses?: DeliveryOrderStatus[] },
  limit = 100,
): Promise<DeliveryOrderDTO[]> {
  const rows = await db.query.deliveryOrders.findMany({
    where: (deliveryOrders) => orderWhere({ statuses: OPEN_ORDER_STATUSES, ...filter }, deliveryOrders),
    with: orderWith,
    orderBy: (deliveryOrders) => ORDER_SORT.upcoming(deliveryOrders),
    limit,
  });
  return rows.map(mapDeliveryOrder);
}

/** How many orders per status, for any filter (tabs, badges, a customer's counts). */
export async function countDeliveryOrdersByStatus(
  filter: DeliveryOrderFilter = {},
): Promise<Partial<Record<DeliveryOrderStatus, number>>> {
  const rows = await db
    .select({ status: deliveryOrders.status, n: countAll })
    .from(deliveryOrders)
    .where(orderWhere(filter, deliveryOrders))
    .groupBy(deliveryOrders.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

/** Months (Cairo, "YYYY-MM") that have orders for this filter, latest first. */
export async function deliveryOrderMonths(filter: DeliveryOrderFilter, limit = 24): Promise<string[]> {
  const month = sql<string>`to_char(${deliveryOrders.scheduledAt} at time zone 'Africa/Cairo', 'YYYY-MM')`;
  const rows = await db
    .selectDistinct({ month })
    .from(deliveryOrders)
    .where(orderWhere(filter, deliveryOrders))
    .orderBy(desc(month))
    .limit(limit);
  return rows.map((r) => r.month);
}

/** Sum of order totals (piastres) for a filter. */
export async function sumDeliveryOrderTotals(filter: DeliveryOrderFilter): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum((${deliveryOrders.priceSnapshot}->>'total')::int), 0)::int` })
    .from(deliveryOrders)
    .where(orderWhere(filter, deliveryOrders));
  return row.total;
}

/** Every order — only for the full-data CSV export (reporting); screens use the paged/ranged reads. */
export async function listDeliveryOrders(): Promise<DeliveryOrderDTO[]> {
  const rows = await db.query.deliveryOrders.findMany({
    with: orderWith,
    orderBy: (deliveryOrders) => desc(deliveryOrders.createdAt),
  });
  return rows.map(mapDeliveryOrder);
}

/** Orders scheduled in [start, end) or whose cash was handed in during it (finance report). */
export async function listDeliveryOrdersForFinance(start: Date, end: Date): Promise<DeliveryOrderDTO[]> {
  const rows = await db.query.deliveryOrders.findMany({
    where: (deliveryOrders) =>
      or(
        and(gte(deliveryOrders.scheduledAt, start), lt(deliveryOrders.scheduledAt, end)),
        and(gte(deliveryOrders.cashReceivedAt, start), lt(deliveryOrders.cashReceivedAt, end)),
      ),
    with: orderWith,
  });
  return rows.map(mapDeliveryOrder);
}

/** Completed cash orders whose cash nobody has recorded as handed in yet (still with the driver). */
export async function listCashPendingOrders(): Promise<DeliveryOrderDTO[]> {
  const rows = await db.query.deliveryOrders.findMany({
    where: (deliveryOrders) =>
      and(
        eq(deliveryOrders.status, "completed"),
        eq(deliveryOrders.billing, "cash"),
        isNull(deliveryOrders.cashReceived),
      ),
    with: orderWith,
    orderBy: (deliveryOrders) => deliveryOrders.scheduledAt,
  });
  return rows.map(mapDeliveryOrder);
}

export async function getDeliveryOrder(code: string): Promise<DeliveryOrderDTO | null> {
  const order = await db.query.deliveryOrders.findFirst({
    where: (deliveryOrders) => eq(deliveryOrders.code, code),
    with: orderWith,
  });
  return order ? mapDeliveryOrder(order) : null;
}

export async function updateDeliveryOrderStatus(code: string, status: DeliveryOrderStatus): Promise<boolean> {
  const res = await db
    .update(deliveryOrders)
    .set({ status })
    .where(eq(deliveryOrders.code, code))
    .returning({ id: deliveryOrders.id });
  return res.length > 0;
}

/** Finished or cancelled orders can't get a (new) driver. */
export async function assignDeliveryDriver(code: string, driverId: string | null): Promise<boolean> {
  const res = await db
    .update(deliveryOrders)
    // Removing the driver sends an in-progress order back to "confirmed · looking for a driver"
    // (it must never stay "assigned" with nobody assigned).
    .set(
      driverId
        ? { driverId, status: "assigned" }
        : {
            driverId: null,
            status: sql`case when ${deliveryOrders.status} in ('assigned','en_route','arrived') then 'confirmed' else ${deliveryOrders.status} end`,
          },
    )
    .where(and(eq(deliveryOrders.code, code), sql`${deliveryOrders.status} NOT IN ('completed','cancelled')`))
    .returning({ id: deliveryOrders.id });
  return res.length > 0;
}

/**
 * A driver moves their own order one step. One conditional update: it only applies while the
 * order is still assigned to this driver and still in `from`, so two taps can't skip a step.
 * Finishing stores the proof of delivery in the same statement.
 */
export async function advanceDeliveryOrderByDriver(
  code: string,
  driverId: string,
  from: DeliveryOrderStatus,
  to: DeliveryOrderStatus,
  pod?: { name: string; photo: string },
): Promise<boolean> {
  const res = await db
    .update(deliveryOrders)
    .set({ status: to, ...(pod ? { podName: pod.name, podPhoto: pod.photo, podAt: new Date() } : {}) })
    .where(
      and(
        eq(deliveryOrders.code, code),
        eq(deliveryOrders.driverId, driverId),
        eq(deliveryOrders.status, from),
      ),
    )
    .returning({ id: deliveryOrders.id });
  return res.length > 0;
}

/** Cash handed in by the driver for a completed cash order (null amount = undo). */
export async function setDeliveryCash(
  code: string,
  amount: number | null,
  by: string | null,
): Promise<boolean> {
  const res = await db
    .update(deliveryOrders)
    .set(
      amount == null
        ? { cashReceived: null, cashReceivedAt: null, cashReceivedBy: null }
        : { cashReceived: amount, cashReceivedAt: new Date(), cashReceivedBy: by },
    )
    .where(
      and(
        eq(deliveryOrders.code, code),
        eq(deliveryOrders.status, "completed"),
        eq(deliveryOrders.billing, "cash"),
      ),
    )
    .returning({ id: deliveryOrders.id });
  return res.length > 0;
}

/** Admin changes the truck size of an order (price already recomputed by the service). */
export async function updateDeliveryOrderSize(
  code: string,
  p: { categoryId: string; sizeName: string; sizeCode: string | null; quote: Quote },
): Promise<boolean> {
  const res = await db
    .update(deliveryOrders)
    .set({ categoryId: p.categoryId, sizeName: p.sizeName, sizeCode: p.sizeCode, priceSnapshot: p.quote })
    .where(eq(deliveryOrders.code, code))
    .returning({ id: deliveryOrders.id });
  return res.length > 0;
}

export async function setDriverFee(code: string, fee: number): Promise<boolean> {
  const res = await db
    .update(deliveryOrders)
    .set({ driverFee: Math.max(0, Math.round(fee)) })
    .where(eq(deliveryOrders.code, code))
    .returning({ id: deliveryOrders.id });
  return res.length > 0;
}

export async function rateDeliveryOrder(
  code: string,
  phone: string,
  rating: number,
  comment: string | null,
): Promise<boolean> {
  const r = Math.max(1, Math.min(5, Math.round(rating)));
  const res = await db
    .update(deliveryOrders)
    .set({ rating: r, ratingComment: comment ?? null })
    .where(
      and(
        eq(deliveryOrders.code, code),
        eq(deliveryOrders.contactPhone, phone),
        eq(deliveryOrders.status, "completed"),
      ),
    )
    .returning({ id: deliveryOrders.id });
  return res.length > 0;
}
