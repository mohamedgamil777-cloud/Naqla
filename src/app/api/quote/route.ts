import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { quote, ServiceError } from "@/services/booking-service";

const Body = z.object({
  vehicleId: z.string().uuid(),
  startISO: z.string().datetime(),
  hours: z.number().int().min(1).max(24 * 30),
  withDriver: z.boolean(),
  withDelivery: z.boolean(),
  loaders: z.number().int().min(0).max(10).optional(),
  km: z.number().min(0).max(100000).optional(),
  promoCode: z.string().max(40).optional().nullable(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  try {
    const q = await quote(parsed.data);
    return NextResponse.json({ quote: q });
  } catch (e) {
    if (e instanceof ServiceError) {
      const status = e.code === "INVALID_PROMO" ? 200 : 400;
      return NextResponse.json({ error: e.code }, { status });
    }
    if (e instanceof Error && (e.message === "BELOW_MIN_HOURS" || e.message === "ABOVE_MAX_HOURS")) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
