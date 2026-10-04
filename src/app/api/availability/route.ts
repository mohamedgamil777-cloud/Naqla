import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDaySlots } from "@/services/booking-service";

const Q = z.object({
  vehicle: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: NextRequest) {
  const parsed = Q.safeParse({
    vehicle: req.nextUrl.searchParams.get("vehicle"),
    date: req.nextUrl.searchParams.get("date"),
  });
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  const slots = await getDaySlots(parsed.data.vehicle, parsed.data.date);
  return NextResponse.json({
    slots: slots.map((s) => ({
      hour24: s.hour24,
      startISO: s.start.toISOString(),
      status: s.status,
    })),
  });
}
