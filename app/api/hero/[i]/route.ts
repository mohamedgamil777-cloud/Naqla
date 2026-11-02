import { NextRequest, NextResponse } from "next/server";
import { getAppContent } from "@/db/lib/settings";
import { withErrorHandling } from "@/lib/route";

/** Home carousel photo #i, served as a real (cacheable) image instead of being inlined in the page. */
export const GET = withErrorHandling(
  "GET /api/hero/[i]",
  async function GET(_req: NextRequest, { params }: { params: Promise<{ i: string }> }) {
    const { i } = await params;
    const src = (await getAppContent()).home.heroImages[Number(i)];
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
  },
);
