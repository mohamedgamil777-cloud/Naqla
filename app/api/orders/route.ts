import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createDeliveryOrder, resolveOrderSchedule } from "@/services/delivery-service";
import { getSession } from "@/services/session";
import { companyContext } from "@/services/company-service";

const Body = z.object({
  categoryId: z.string().uuid(),
  km: z.number().min(0).max(100000),
  loaders: z.number().int().min(0).max(10).optional(),
  promoCode: z.string().max(40).optional().nullable(),
  // the driver needs readable addresses — required, not just pins
  pickupAddress: z.string().trim().min(3).max(300),
  dropoffAddress: z.string().trim().min(3).max(300),
  pickupDetails: z.string().max(200).optional().nullable(),
  dropoffDetails: z.string().max(200).optional().nullable(),
  cargoType: z.string().max(60).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  pickupLat: z.number().optional().nullable(),
  pickupLng: z.number().optional().nullable(),
  dropoffLat: z.number().optional().nullable(),
  dropoffLng: z.number().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function POST(req: NextRequest) {
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

  const result = await createDeliveryOrder({
    categoryId: d.categoryId,
    km: d.km,
    loaders: d.loaders,
    promoCode: d.promoCode,
    pickupAddress: d.pickupAddress,
    dropoffAddress: d.dropoffAddress,
    pickupDetails: d.pickupDetails,
    dropoffDetails: d.dropoffDetails,
    cargoType: d.cargoType,
    notes: d.notes,
    pickupLat: d.pickupLat,
    pickupLng: d.pickupLng,
    dropoffLat: d.dropoffLat,
    dropoffLng: d.dropoffLng,
    scheduledAt,
    contactName: session.name ?? "عميل",
    contactPhone: session.phone,
    companyId: (await companyContext(session.phone))?.company.id ?? null,
  });

  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });
  return NextResponse.json({ code: result.code });
}
