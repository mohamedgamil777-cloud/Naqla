import { NextResponse } from "next/server";
import { clearSession } from "@/services/session";
import { withErrorHandling } from "@/lib/route";

export const POST = withErrorHandling("POST /api/auth/logout", async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
});
