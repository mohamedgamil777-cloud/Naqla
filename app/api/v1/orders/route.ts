import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { searchDeliveryOrders } from "@/db/lib/delivery-orders";
import { getSession } from "@/services/session";
import { err } from "../_lib";
import { withErrorHandling } from "@/lib/route";

export const dynamic = "force-dynamic";

// POST = place an order (same body/rules as the website).
export { POST } from "@/app/api/orders/route";

const PAGE_SIZE = 20;
const Query = z.object({ page: z.coerce.number().int().min(1).max(10_000).catch(1) });

/** My delivery orders, newest first, one page at a time (?page=N). */
export const GET = withErrorHandling("GET /api/v1/orders", async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return err("LOGIN_REQUIRED", 401);
  const { page } = Query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const result = await searchDeliveryOrders({ phone: session.phone }, page, PAGE_SIZE);
  return NextResponse.json({
    // the customer never sees driver pay, the internal cash hand-in or the staff name; the
    // proof-of-delivery photo (a large data URL) is served on its own at /pod
    orders: result.rows.map(
      ({ driverFee, driverId, cashReceived, cashReceivedAt, cashReceivedBy, agentName, podPhoto, ...o }) => ({
        ...o,
        pod: o.podAt
          ? { name: o.podName, at: o.podAt.toISOString(), photoUrl: `/api/v1/orders/${o.code}/pod` }
          : null,
      }),
    ),
    page: { page: result.page, totalPages: result.totalPages, total: result.total },
  });
});
