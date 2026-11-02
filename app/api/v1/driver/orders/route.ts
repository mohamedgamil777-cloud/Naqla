import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { listOpenDeliveryOrders, searchDeliveryOrders } from "@/db/lib/delivery-orders";
import { getSession } from "@/services/session";
import { driverByPhone } from "@/services/driver-service";
import { driverStats } from "@/db/lib/drivers";
import type { DeliveryOrderDTO, DeliveryOrderStatus } from "@/types";
import { cairoDateISO } from "@/lib/time";
import { err } from "../../_lib";
import { withErrorHandling } from "@/lib/route";

export const dynamic = "force-dynamic";

const ACTIVE: DeliveryOrderStatus[] = ["assigned", "en_route", "arrived"];
const HISTORY_PAGE_SIZE = 20;
const Query = z.object({ page: z.coerce.number().int().min(1).max(10_000).catch(1) });

/**
 * The logged-in driver's work: now (started or due by today), upcoming (later days), one page of
 * finished orders (?page=N, newest first) and totals summed in the database.
 */
export const GET = withErrorHandling("GET /api/v1/driver/orders", async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return err("LOGIN_REQUIRED", 401);
  const driver = await driverByPhone(session.phone);
  if (!driver) return err("NOT_DRIVER", 403);
  const { page } = Query.parse(Object.fromEntries(req.nextUrl.searchParams));

  const [active, history, stats] = await Promise.all([
    listOpenDeliveryOrders({ driverId: driver.id, statuses: ACTIVE }),
    searchDeliveryOrders({ driverId: driver.id, status: "completed" }, page, HISTORY_PAGE_SIZE, "recent"),
    driverStats(driver.id),
  ]);
  // the driver sees their fee and what to collect in cash, never the customer's price breakdown
  const forDriver = ({
    priceSnapshot,
    podPhoto,
    cashReceived,
    cashReceivedAt,
    cashReceivedBy,
    ...o
  }: DeliveryOrderDTO) => ({
    ...o,
    collect: o.billing === "cash" ? priceSnapshot.total : 0,
    pod: o.podAt
      ? { name: o.podName, at: o.podAt.toISOString(), photoUrl: `/api/v1/orders/${o.code}/pod` }
      : null,
  });
  const today = cairoDateISO(new Date());
  const now = active.filter((o) => o.status !== "assigned" || cairoDateISO(o.scheduledAt) <= today);
  const upcoming = active.filter((o) => !now.includes(o));

  return NextResponse.json({
    driver: { id: driver.id, name: driver.name, phone: driver.phone, available: driver.available },
    stats: {
      completed: stats.completed,
      earned: stats.earned,
      rating: stats.rating
        ? { avg: Math.round(stats.rating.avg * 10) / 10, count: stats.rating.count }
        : null,
    },
    now: now.map(forDriver),
    upcoming: upcoming.map(forDriver),
    history: history.rows.map(forDriver),
    historyPage: { page: history.page, totalPages: history.totalPages, total: history.total },
  });
});
