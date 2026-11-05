import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDurations } from "@/services/booking-service";
import { withErrorHandling } from "@/lib/route";

const Q = z.object({ vehicle: z.guid(), start: z.string().datetime() });

export const GET = withErrorHandling("GET /api/availability/durations", async function GET(req: NextRequest) {
  const parsed = Q.safeParse({
    vehicle: req.nextUrl.searchParams.get("vehicle"),
    start: req.nextUrl.searchParams.get("start"),
  });
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  const durations = await getDurations(parsed.data.vehicle, parsed.data.start);
  return NextResponse.json({ durations });
});
