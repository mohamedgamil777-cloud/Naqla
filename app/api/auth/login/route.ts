import { NextRequest } from "next/server";
import { z } from "zod";
import { loginWithPassword } from "@/services/auth";
import { authFailure, badRequest, signedIn } from "@/services/auth-http";
import { withErrorHandling } from "@/lib/route";

// "phone" is the login: a phone number, or a username for company users
const Body = z.object({ phone: z.string().trim().min(3).max(40), password: z.string().min(1).max(128) });

/** Phone (or username) + password → session cookie (website) and { token } (mobile app). */
export const POST = withErrorHandling("POST /api/auth/login", async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest();
  try {
    return await signedIn(await loginWithPassword(parsed.data.phone, parsed.data.password));
  } catch (e) {
    return authFailure(e);
  }
});
