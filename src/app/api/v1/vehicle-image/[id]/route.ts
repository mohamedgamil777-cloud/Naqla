import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/data/repo";

/** An uploaded car-type photo, served as a real image (the URL carries ?v=<fingerprint>). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cat = (await repo.listCategories()).find((c) => c.id === id);
  const m = cat?.image?.match(/^data:([^;,]+);base64,(.*)$/);
  if (!m) return new NextResponse("not found", { status: 404 });
  return new NextResponse(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
