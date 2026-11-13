import { NextRequest } from "next/server";
import { z } from "zod";
import { resetPasswordWithCode } from "@/services/auth";
import { authFailure, badRequest, signedIn } from "@/services/auth-http";
import { withErrorHandling } from "@/lib/route";

const Body = z.object({
  login: z.string().trim().min(3).max(40),
  code: z.string().trim().regex(/^\d{6}$/),
  password: z.string().min(1).max(128),
});

/** Forgot password, step 2: the code + a new password → signed in. */
export const POST = withErrorHandling("POST /api/auth/reset/confirm", async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest();
  try {
    return await signedIn(await resetPasswordWithCode(parsed.data.login, parsed.data.code, parsed.data.password));
  } catch (e) {
    return authFailure(e);
  }
});
