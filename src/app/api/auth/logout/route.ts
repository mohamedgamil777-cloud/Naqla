import { NextResponse } from "next/server";
import { clearSession } from "@/services/session";

export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
