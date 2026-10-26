import { NextResponse } from "next/server";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { customerOrderJson, err } from "../_lib";

export const dynamic = "force-dynamic";

// POST = place an order (same body/rules as the website).
export { POST } from "@/app/api/orders/route";

/** My delivery orders, newest first. */
export async function GET() {
  const session = await getSession();
  if (!session) return err("LOGIN_REQUIRED", 401);
  const orders = await repo.listDeliveryOrdersByPhone(session.phone);
  return NextResponse.json({
    orders: orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(customerOrderJson),
  });
}
