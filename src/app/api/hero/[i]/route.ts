import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/data/repo";

/** Home carousel photo #i, served as a real (cacheable) image instead of being inlined in the page. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ i: string }> }) {
  const { i } = await params;
  const src = (await repo.getAppContent()).home.heroImages[Number(i)];
  if (!src) return new NextResponse("not found", { status: 404 });
  if (!src.startsWith("data:")) return NextResponse.redirect(new URL(src, _req.url));
  const m = src.match(/^data:([^;,]+);base64,(.*)$/);
  if (!m) return new NextResponse("bad image", { status: 500 });
  return new NextResponse(Buffer.from(m[2], "base64"), {
    headers: {
      "Content-Type": m[1],
      // the URL carries ?v=<fingerprint>, so a changed photo gets a new URL
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
