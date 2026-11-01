import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { driverByPhone } from "@/services/driver-service";
import { err } from "../../../_lib";

/** Proof-of-delivery photo — only for the order's customer or its driver. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession();
  if (!session) return err("LOGIN_REQUIRED", 401);
  const { code } = await params;
  const order = await repo.getDeliveryOrder(code);
  if (!order?.podPhoto) return err("NOT_FOUND", 404);
  const driver = await driverByPhone(session.phone);
  if (order.contactPhone !== session.phone && (!driver || order.driverId !== driver.id)) return err("NOT_FOUND", 404);
  const m = order.podPhoto.match(/^data:([^;,]+);base64,(.*)$/);
  if (!m) return err("NOT_FOUND", 404);
  return new NextResponse(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=86400" },
  });
}
