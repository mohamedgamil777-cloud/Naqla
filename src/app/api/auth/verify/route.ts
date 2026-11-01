import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp, AuthError } from "@/services/auth";
import { setSession } from "@/services/session";

const Body = z.object({
  phone: z.string().min(6).max(20),
  code: z.string().min(4).max(6),
  name: z.string().min(2).max(80).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  try {
    const { phone } = await verifyOtp(parsed.data.phone, parsed.data.code);
    const token = await setSession({ phone, name: parsed.data.name });
    // the mobile app stores `token` and sends it as "Authorization: Bearer <token>"
    return NextResponse.json({ ok: true, phone, token });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 400 });
    throw e;
  }
}
