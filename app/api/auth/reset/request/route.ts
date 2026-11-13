import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/services/auth";
import { authFailure, badRequest } from "@/services/auth-http";
import { withErrorHandling } from "@/lib/route";

const Body = z.object({ login: z.string().trim().min(3).max(40) });

/** Forgot password, step 1: a code by SMS to the account's phone (same answer for unknown accounts). */
export const POST = withErrorHandling("POST /api/auth/reset/request", async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest();
  try {
    const { sentTo } = await requestPasswordReset(parsed.data.login);
    return NextResponse.json({ ok: true, sentTo });
  } catch (e) {
    return authFailure(e);
  }
});
