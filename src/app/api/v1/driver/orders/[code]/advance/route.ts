import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/services/session";
import { advanceDeliveryOrder, driverByPhone } from "@/services/driver-service";
import { err } from "../../../../_lib";

const Body = z.object({
  to: z.enum(["en_route", "arrived", "completed"]),
  // required for "completed": who received it + a photo as a data:image/...;base64 URL (≤ ~2 MB)
  podName: z.string().max(80).optional(),
  podPhoto: z.string().max(3_000_000).optional(),
});

/** Driver moves their trip one step forward. Errors come back as Arabic text in `message`. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession();
  if (!session) return err("LOGIN_REQUIRED", 401);
  const driver = await driverByPhone(session.phone);
  if (!driver) return err("NOT_DRIVER", 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("BAD_REQUEST");
  const { code } = await params;
  const r = await advanceDeliveryOrder(driver, code, parsed.data.to, { name: parsed.data.podName, photo: parsed.data.podPhoto });
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "STEP_REFUSED", message: r.error }, { status: 400 });
}
