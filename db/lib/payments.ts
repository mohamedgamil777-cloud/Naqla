/** Payments recorded against rental bookings. */
import { and, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { bookings, payments } from "@/db/schema";
import type { PaymentDTO, PaymentInput } from "@/types";
import { bookingIdByCode, mapPayment } from "./shared";

export async function listPayments(bookingCode: string): Promise<PaymentDTO[]> {
  const rows = await db.query.payments.findMany({
    where: (payments) => eq(payments.bookingId, bookingIdByCode(bookingCode)),
    orderBy: (payments) => payments.createdAt,
  });
  return rows.map((p) => mapPayment(p, bookingCode));
}

export async function addPayment(input: PaymentInput): Promise<{ id: string } | null> {
  const b = await db.query.bookings.findFirst({
    where: (bookings) => eq(bookings.code, input.bookingCode),
    columns: { id: true },
  });
  if (!b) return null;
  const [created] = await db
    .insert(payments)
    .values({
      bookingId: b.id,
      method: input.method,
      kind: input.kind,
      amountPiastres: input.amount,
      note: input.note ?? null,
    })
    .returning({ id: payments.id });
  return { id: created.id };
}

/** Money collected (dashboard): all-time rent, rent since `todayStart`, deposits held. */
export async function paymentTotals(
  todayStart: Date,
): Promise<{ collectedTotal: number; collectedToday: number; depositsHeld: number }> {
  const [row] = await db
    .select({
      collectedTotal: sql<number>`coalesce(sum(${payments.amountPiastres}) filter (where ${payments.kind} = 'rent' and ${payments.status} = 'paid'), 0)::int`,
      collectedToday: sql<number>`coalesce(sum(${payments.amountPiastres}) filter (where ${payments.kind} = 'rent' and ${payments.status} = 'paid' and ${payments.createdAt} >= ${todayStart.toISOString()}::timestamptz), 0)::int`,
      depositsHeld: sql<number>`coalesce(sum(${payments.amountPiastres}) filter (where ${payments.kind} = 'deposit' and ${payments.status} = 'paid'), 0)::int`,
    })
    .from(payments);
  return row;
}

/** Payments made in [start, end) or belonging to a booking that starts in it (finance report). */
export async function listPaymentsForFinance(start: Date, end: Date): Promise<PaymentDTO[]> {
  const bookingsInRange = db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(gte(bookings.startsAt, start), lt(bookings.startsAt, end)));
  const rows = await db.query.payments.findMany({
    where: (payments) =>
      or(
        and(gte(payments.createdAt, start), lt(payments.createdAt, end)),
        inArray(payments.bookingId, bookingsInRange),
      ),
    with: { booking: { columns: { code: true } } },
    orderBy: (payments) => payments.createdAt,
  });
  return rows.map((p) => mapPayment(p, p.booking.code));
}

export async function listAllPaymentsFull(): Promise<PaymentDTO[]> {
  const rows = await db.query.payments.findMany({
    with: { booking: { columns: { code: true } } },
    orderBy: (payments) => payments.createdAt,
  });
  return rows.map((p) => mapPayment(p, p.booking.code));
}

/** Refund / delete a payment of THIS booking only. */
export async function refundPayment(bookingCode: string, id: string): Promise<boolean> {
  const res = await db
    .update(payments)
    .set({ status: "refunded" })
    .where(and(eq(payments.id, id), eq(payments.bookingId, bookingIdByCode(bookingCode))))
    .returning({ id: payments.id });
  return res.length > 0;
}

export async function deletePayment(bookingCode: string, id: string): Promise<boolean> {
  const res = await db
    .delete(payments)
    .where(and(eq(payments.id, id), eq(payments.bookingId, bookingIdByCode(bookingCode))))
    .returning({ id: payments.id });
  return res.length > 0;
}
