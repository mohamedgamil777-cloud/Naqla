import { NextResponse } from "next/server";
import { getSession } from "@/services/session";
import { companyContext } from "@/services/company-service";
import { driverByPhone } from "@/services/driver-service";
import { err } from "../_lib";

export const dynamic = "force-dynamic";

/** Who is logged in: phone, name, company (B2B) and whether this phone is a driver. */
export async function GET() {
  const session = await getSession();
  if (!session) return err("LOGIN_REQUIRED", 401);
  const [ctx, driver] = await Promise.all([companyContext(session.phone), driverByPhone(session.phone)]);
  return NextResponse.json({
    phone: session.phone,
    name: session.name ?? null,
    company: ctx
      ? { name: ctx.company.name, discountPct: ctx.company.discountPct, billing: ctx.company.billing, role: ctx.member.role }
      : null,
    driver: driver ? { id: driver.id, name: driver.name, available: driver.available } : null,
  });
}
