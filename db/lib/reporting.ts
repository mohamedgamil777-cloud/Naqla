/** Counts for the reports page. */
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/** Row counts of the export datasets (see services/reporting-service DATASET_META). */
export async function reportRowCounts(): Promise<
  Record<
    | "delivery-orders"
    | "bookings-full"
    | "payments"
    | "fleet"
    | "customers"
    | "staff"
    | "categories"
    | "blocks",
    number
  >
> {
  const count = (table: string) => sql.raw(`(select count(*)::int from ${table})`);
  const [row] = await db
    .select({
      orders: sql<number>`${count("delivery_orders")}`,
      bookings: sql<number>`${count("bookings")}`,
      payments: sql<number>`${count("payments")}`,
      vehicles: sql<number>`${count("vehicles")}`,
      staff: sql<number>`(select count(*)::int from users where role <> 'customer')`,
      categories: sql<number>`${count("vehicle_categories")}`,
      blocks: sql<number>`${count("vehicle_blocks")}`,
      customers: sql<number>`(select count(*)::int from (
          select contact_phone from bookings where contact_phone is not null and contact_phone <> ''
          union
          select contact_phone from delivery_orders
          where contact_phone is not null and contact_phone <> '' and status <> 'cancelled'
        ) phones)`,
    })
    .from(sql`(select 1) one`);
  return {
    "delivery-orders": row.orders,
    "bookings-full": row.bookings,
    payments: row.payments,
    fleet: row.vehicles,
    customers: row.customers,
    staff: row.staff,
    categories: row.categories,
    blocks: row.blocks,
  };
}
