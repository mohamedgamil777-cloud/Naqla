import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/services/session";
import { cancelBooking } from "@/db/lib/bookings";
import { withErrorHandling } from "@/lib/route";

export const POST = withErrorHandling(
  "POST /api/bookings/[code]/cancel",
  async function POST(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "NEEDS_AUTH" }, { status: 401 });
    const { code } = await params;
    const ok = await cancelBooking(code, session.phone);
    if (!ok) return NextResponse.json({ error: "NOT_FOUND_OR_LOCKED" }, { status: 400 });
    return NextResponse.json({ ok: true });
  },
);
