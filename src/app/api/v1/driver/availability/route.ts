import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { driverByPhone } from "@/services/driver-service";
import { err } from "../../_lib";

const Body = z.object({ available: z.boolean() });

/** Driver's own "متاح للعمل" switch. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return err("LOGIN_REQUIRED", 401);
  const driver = await driverByPhone(session.phone);
  if (!driver) return err("NOT_DRIVER", 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("BAD_REQUEST");
  await repo.setStaffAvailable(driver.id, parsed.data.available);
  return NextResponse.json({ ok: true, available: parsed.data.available });
}
