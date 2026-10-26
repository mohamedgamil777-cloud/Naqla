import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { err } from "../../../_lib";

const Body = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional().nullable(),
});

/** Customer rates the driver of their completed order (1–5 stars). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession();
  if (!session) return err("LOGIN_REQUIRED", 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("BAD_REQUEST");
  const { code } = await params;
  const ok = await repo.rateDeliveryOrder(code, session.phone, parsed.data.rating, parsed.data.comment || null);
  return ok ? NextResponse.json({ ok: true }) : err("NOT_ALLOWED");
}
