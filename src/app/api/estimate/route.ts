import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { estimateDelivery } from "@/services/delivery-service";

const Body = z.object({
  categoryId: z.string().uuid(),
  km: z.number().min(0).max(100000),
  loaders: z.number().int().min(0).max(10).optional(),
  promoCode: z.string().max(40).optional().nullable(),
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
  const result = await estimateDelivery(parsed.data);
  if (!result) return NextResponse.json({ error: "SIZE_NOT_FOUND" }, { status: 400 });
  return NextResponse.json(result);
}
