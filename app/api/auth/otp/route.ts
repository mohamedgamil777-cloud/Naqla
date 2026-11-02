import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/route";

/** OTP login is switched off for now (phone + password instead: /api/auth/login, /api/auth/register).
 *  It will return later as a second factor / one-time login code. */
export const POST = withErrorHandling("POST /api/auth/otp", async function POST() {
  return NextResponse.json({ error: "OTP_DISABLED" }, { status: 410 });
});
