import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createDeliveryOrder, resolveOrderSchedule } from "@/services/delivery-service";
import { pointFrom, tripDistance } from "@/services/route-service";
import { getSession } from "@/services/session";
import { companyContext } from "@/services/company-service";
import { withErrorHandling } from "@/lib/route";

const Body = z.object({
  categoryId: z.guid(),
  /** legacy: only used while no server Maps key is configured and there are no pins */
  km: z.number().min(0).max(100000).optional(),
  loaders: z.number().int().min(0).max(10).optional(),
  promoCode: z.string().max(40).optional().nullable(),
  // the driver needs readable addresses — required, not just pins
  pickupAddress: z.string().trim().min(3).max(300),
  dropoffAddress: z.string().trim().min(3).max(300),
  pickupDetails: z.string().max(300).optional().nullable(),
  dropoffDetails: z.string().max(300).optional().nullable(),
  cargoType: z.string().max(60).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  pickupLat: z.number().optional().nullable(),
  pickupLng: z.number().optional().nullable(),
  dropoffLat: z.number().optional().nullable(),
  dropoffLng: z.number().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

export const POST = withErrorHandling("POST /api/orders", async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  const d = parsed.data;

  const when = await resolveOrderSchedule(d.date, d.time);
  if (!when.ok) return NextResponse.json({ error: when.reason }, { status: 400 });
  const scheduledAt = when.scheduledAt;

  // price with the server's distance (road distance once GOOGLE_MAPS_SERVER_KEY is set), never the browser's
  const trip = await tripDistance({
    pickup: pointFrom(d.pickupLat, d.pickupLng),
    dropoff: pointFrom(d.dropoffLat, d.dropoffLng),
    pickupAddress: d.pickupAddress,
    dropoffAddress: d.dropoffAddress,
    customerKm: d.km,
  });
  if (!trip.ok) return NextResponse.json({ error: trip.reason }, { status: 400 });

  const result = await createDeliveryOrder({
    categoryId: d.categoryId,
    km: trip.km,
    loaders: d.loaders,
    promoCode: d.promoCode,
    pickupAddress: d.pickupAddress,
    dropoffAddress: d.dropoffAddress,
    pickupDetails: d.pickupDetails,
    dropoffDetails: d.dropoffDetails,
    cargoType: d.cargoType,
    notes: d.notes,
    // the pins the price was measured between (found from the typed address when the page sent none)
    pickupLat: trip.pickup?.lat ?? null,
    pickupLng: trip.pickup?.lng ?? null,
    dropoffLat: trip.dropoff?.lat ?? null,
    dropoffLng: trip.dropoff?.lng ?? null,
    scheduledAt,
    contactName: session.name ?? "عميل",
    contactPhone: session.phone,
    companyId: (await companyContext(session.phone))?.company.id ?? null,
  });

  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });
  return NextResponse.json({ code: result.code });
});
