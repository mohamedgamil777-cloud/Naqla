import { NextRequest } from "next/server";
import { z } from "zod";
import { registerCustomer } from "@/services/auth";
import { authFailure, badRequest, signedIn } from "@/services/auth-http";

const Body = z.object({
  phone: z.string().trim().min(6).max(20),
  name: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(128),
});

/** New customer account (or first password for an existing customer without one) → signed in. */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest();
  try {
    return await signedIn(await registerCustomer(parsed.data.phone, parsed.data.name, parsed.data.password));
  } catch (e) {
    return authFailure(e);
  }
}
