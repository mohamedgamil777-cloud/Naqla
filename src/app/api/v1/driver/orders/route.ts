import { NextResponse } from "next/server";
import { repo } from "@/data/repo";
import { getSession } from "@/services/session";
import { driverByPhone } from "@/services/driver-service";
import { driverRatings } from "@/services/ratings";
import { cairoDateISO } from "@/lib/time";
import { driverOrderJson, err } from "../../_lib";

export const dynamic = "force-dynamic";

const ACTIVE = new Set(["assigned", "en_route", "arrived"]);

/** The logged-in driver's work: now (started or due by today), upcoming (later days), history, totals. */
export async function GET() {
  const session = await getSession();
  if (!session) return err("LOGIN_REQUIRED", 401);
  const driver = await driverByPhone(session.phone);
  if (!driver) return err("NOT_DRIVER", 403);

  const orders = await repo.listDeliveryOrdersByDriver(driver.id);
  const today = cairoDateISO(new Date());
  const active = orders.filter((o) => ACTIVE.has(o.status)).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  const now = active.filter((o) => o.status !== "assigned" || cairoDateISO(o.scheduledAt) <= today);
  const upcoming = active.filter((o) => !now.includes(o));
  const done = orders.filter((o) => o.status === "completed").sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  const rating = driverRatings(orders)[driver.id] ?? null;

  return NextResponse.json({
    driver: { id: driver.id, name: driver.name, phone: driver.phone, available: driver.available },
    stats: {
      completed: done.length,
      earned: done.reduce((s, o) => s + (o.driverFee || 0), 0),
      rating: rating ? { avg: Math.round(rating.avg * 10) / 10, count: rating.count } : null,
    },
    now: now.map(driverOrderJson),
    upcoming: upcoming.map(driverOrderJson),
    history: done.slice(0, 50).map(driverOrderJson),
  });
}
