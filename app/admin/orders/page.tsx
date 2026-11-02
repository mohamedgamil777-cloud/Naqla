import { z } from "zod";
import Link from "next/link";
import { verifiedPhones } from "@/db/lib/accounts";
import { listCategories } from "@/db/lib/categories";
import { listCompanies } from "@/db/lib/companies";
import {
  countDeliveryOrdersByStatus,
  listCashPendingOrders,
  searchDeliveryOrders,
} from "@/db/lib/delivery-orders";
import { driverRatingStats, listDrivers } from "@/db/lib/drivers";
import { requirePermission } from "@/lib/authz";
import { can } from "@/lib/permissions";
import { Pagination, listHref } from "@/components/Pagination";
import { CashPendingSummary } from "@/components/admin/orders/CashPendingSummary";
import { OrderCard } from "@/components/admin/orders/OrderCard";
import { OrdersFilter } from "@/components/admin/orders/OrdersFilter";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const Query = z.object({
  status: z
    .enum(["open", "new", "confirmed", "assigned", "en_route", "arrived", "completed", "cancelled"])
    .optional()
    .catch(undefined),
  q: z.string().trim().max(60).catch(""),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { role } = await requirePermission("delivery:read");
  const { status, q, page } = Query.parse(await searchParams);

  const [result, statusCounts, cashPending, drivers, categories, companies, ratings] = await Promise.all([
    searchDeliveryOrders({ status, q }, page, PAGE_SIZE),
    countDeliveryOrdersByStatus(),
    listCashPendingOrders(),
    listDrivers(),
    listCategories(),
    listCompanies(),
    driverRatingStats(),
  ]);
  // agents confirm customer numbers by phone (no OTP for now) — flag orders from unconfirmed numbers
  const verified = await verifiedPhones(result.rows.map((o) => o.contactPhone ?? ""));
  const canVerify = can(role, "customer:manage");
  const companyName = new Map(companies.map((c) => [c.id, c.name]));
  const sizes = categories.filter((c) => c.sizeCode && c.active);
  const newCount = statusCounts.new ?? 0;
  const openCount = ["new", "confirmed", "assigned", "en_route", "arrived"].reduce(
    (sum, s) => sum + (statusCounts[s as keyof typeof statusCounts] ?? 0),
    0,
  );
  const href = (p: number) => listHref("/admin/orders", { status, q, page: p });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">طلبات التوصيل (A→B)</h1>
          <p className="text-muted">
            طلبات العملاء من الموقع والتليفون.{" "}
            {newCount > 0 && <span className="font-bold text-rented">عندك {newCount} طلب جديد.</span>}
          </p>
        </div>
        <Link href="/admin/new-order" className="rounded-xl bg-primary text-white px-4 py-2 font-bold tap">
          ☎️ طلب جديد بالتليفون
        </Link>
      </div>

      <CashPendingSummary orders={cashPending} />
      <OrdersFilter status={status} q={q} counts={{ open: openCount, new: newCount }} />

      {result.rows.length === 0 ? (
        <div className="bg-panel border border-line rounded-card p-8 text-center text-muted">
          {q || status ? "مفيش طلبات بالفلتر ده." : "لسه مفيش طلبات توصيل."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {result.rows.map((o) => (
            <OrderCard
              key={o.code}
              order={o}
              companyName={o.companyId ? (companyName.get(o.companyId) ?? null) : null}
              phoneVerified={!o.contactPhone || verified.has(o.contactPhone)}
              canVerify={canVerify}
              drivers={drivers}
              ratings={ratings}
              sizes={sizes}
            />
          ))}
        </div>
      )}
      <Pagination page={result.page} totalPages={result.totalPages} href={href} />
    </div>
  );
}
