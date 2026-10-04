import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDurations } from "@/services/booking-service";

const Q = z.object({ vehicle: z.string().uuid(), start: z.string().datetime() });

export async function GET(req: NextRequest) {
  const parsed = Q.safeParse({
    vehicle: req.nextUrl.searchParams.get("vehicle"),
    start: req.nextUrl.searchParams.get("start"),
  });
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  const durations = await getDurations(parsed.data.vehicle, parsed.data.start);
  return NextResponse.json({ durations });
}
