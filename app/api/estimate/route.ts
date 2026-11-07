import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { estimateDelivery } from "@/services/delivery-service";
import { pointFrom, tripDistance } from "@/services/route-service";
import { getSession } from "@/services/session";
import { companyContext } from "@/services/company-service";
import { withErrorHandling } from "@/lib/route";

const Body = z.object({
  categoryId: z.guid(),
  /** legacy: only used while no server Maps key is configured and there are no pins */
  km: z.number().min(0).max(100000).optional(),
  pickupLat: z.number().optional().nullable(),
  pickupLng: z.number().optional().nullable(),
  dropoffLat: z.number().optional().nullable(),
  dropoffLng: z.number().optional().nullable(),
  pickupAddress: z.string().max(300).optional().nullable(),
  dropoffAddress: z.string().max(300).optional().nullable(),
  loaders: z.number().int().min(0).max(10).optional(),
  promoCode: z.string().max(40).optional().nullable(),
});

export const POST = withErrorHandling("POST /api/estimate", async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  // company members always see their contract price
  const session = await getSession();
  const ctx = session ? await companyContext(session.phone) : null;
  const d = parsed.data;
  // the distance is worked out here, never taken from the browser (see services/route-service.ts)
  const trip = await tripDistance({
    pickup: pointFrom(d.pickupLat, d.pickupLng),
    dropoff: pointFrom(d.dropoffLat, d.dropoffLng),
    pickupAddress: d.pickupAddress,
    dropoffAddress: d.dropoffAddress,
    customerKm: d.km,
  });
  if (!trip.ok) return NextResponse.json({ error: trip.reason }, { status: 422 });
  const result = await estimateDelivery({
    categoryId: d.categoryId,
    km: trip.km,
    loaders: d.loaders,
    promoCode: d.promoCode,
    companyId: ctx?.company.id ?? null,
  });
  if (!result) return NextResponse.json({ error: "SIZE_NOT_FOUND" }, { status: 400 });
  return NextResponse.json({ ...result, km: trip.km, distanceSource: trip.source });
});
