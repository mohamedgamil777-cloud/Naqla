import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createDeliveryOrder } from "@/services/delivery-service";
import { getSession } from "@/services/session";
import { cairoDateISO, cairoDateTime } from "@/lib/time";
import { repo } from "@/data/repo";

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

  const [hour, minute] = d.time.split(":").map(Number);
  const scheduledAt = cairoDateTime(d.date, hour, minute);
  // Must match what the order screen offers: minimum notice, working hours, booking window.
  const [branch, business] = await Promise.all([repo.defaultBranch(), repo.getBusiness()]);
  if (scheduledAt.getTime() < Date.now() + business.nowLeadHours * 3600e3 - 60e3) {
    return NextResponse.json({ error: "PAST" }, { status: 400 });
  }
  const mins = hour * 60 + minute;
  if (mins < branch.working.open * 60 || mins >= branch.working.close * 60) {
    return NextResponse.json({ error: "HOURS" }, { status: 400 });
  }
  const lastDay = cairoDateISO(new Date(Date.now() + business.advanceDays * 864e5));
  if (d.date > lastDay) return NextResponse.json({ error: "TOO_FAR" }, { status: 400 });

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
  });

  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });
  return NextResponse.json({ code: result.code });
}
