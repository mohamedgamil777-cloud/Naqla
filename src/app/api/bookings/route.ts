import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBooking } from "@/services/booking-service";
import { getSession } from "@/services/session";
import { repo } from "@/data/repo";
import { getNotifier, bookingConfirmedMessage } from "@/services/notify";

const Body = z.object({
  vehicleId: z.string().uuid(),
  startISO: z.string().datetime(),
  hours: z.number().int().min(1).max(24 * 30),
  withDriver: z.boolean(),
  withDelivery: z.boolean(),
  loaders: z.number().int().min(0).max(10).optional(),
  deliveryAddress: z.record(z.string(), z.unknown()).optional().nullable(),
  promoCode: z.string().max(40).optional().nullable(),
  contactName: z.string().min(2).max(80),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "NEEDS_AUTH" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const result = await createBooking({
    ...parsed.data,
    contactPhone: session.phone,
  });

  if (!("code" in result)) {
    return NextResponse.json(
      { error: "UNAVAILABLE", reason: result.reason, alternatives: result.alternatives },
      { status: 409 }
    );
  }

  // Fire-and-forget confirmation (log adapter in MVP).
  const booking = await repo.getBooking(result.code);
  if (booking) {
    getNotifier()
      .notify("whatsapp", session.phone, bookingConfirmedMessage(booking))
      .catch(() => {});
  }

  return NextResponse.json({ code: result.code, quote: result.quote });
}
