import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendOtp, AuthError } from "@/services/auth";

const Body = z.object({ phone: z.string().min(6).max(20) });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
  try {
    const { phone, devCode, staffUsePasscode } = await sendOtp(parsed.data.phone);
    return NextResponse.json({ ok: true, phone, devCode, staffUsePasscode });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 400 });
    throw e;
  }
}
