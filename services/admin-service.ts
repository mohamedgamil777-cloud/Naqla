import { getBusyForVehicles } from "@/db/lib/availability";
import {
  countActiveBookings,
  countBookingsByStatus,
  listBookingsStartingBetween,
  listUpcomingBookings,
} from "@/db/lib/bookings";
import { defaultBranch } from "@/db/lib/branches";
import { paymentTotals } from "@/db/lib/payments";
import { getBusiness } from "@/db/lib/settings";
import { listVehicles } from "@/db/lib/vehicles";
import { cairoDateISO, cairoDateTime, nextDateISO } from "@/lib/time";
import type { VehicleStatus } from "@/lib/constants";
import type { SlotStatus } from "@/engines/availability";

export async function getDashboard() {
  const now = new Date();
  const todayISO = cairoDateISO(now);
  const todayStart = cairoDateTime(todayISO, 0);
  const tomorrowStart = cairoDateTime(nextDateISO(todayISO), 0);

  const [vehicles, activeRentals, todaysAll, upcoming, byStatus, money] = await Promise.all([
    listVehicles(),
    countActiveBookings(now),
    listBookingsStartingBetween(todayStart, tomorrowStart),
    listUpcomingBookings(now, 6),
    countBookingsByStatus(),
    // actual money collected (recorded payments), not expected booking totals
    paymentTotals(todayStart),
  ]);
  const counts: Record<VehicleStatus, number> = {
    available: 0,
    reserved: 0,
    rented: 0,
    maintenance: 0,
    inactive: 0,
  };
  for (const v of vehicles) counts[v.status]++;

  const todays = todaysAll.filter((b) => b.status !== "cancelled");
  // Expected revenue from bookings starting today (for reference).
  const expectedToday = todays.reduce((sum, b) => sum + b.priceSnapshot.total, 0);

  return {
    counts,
    fleetSize: vehicles.length,
    activeRentals,
    todaysBookings: todays.length,
    collectedToday: money.collectedToday,
    collectedTotal: money.collectedTotal,
    depositsHeld: money.depositsHeld,
    expectedToday,
    upcoming,
    cancellations: byStatus.cancelled ?? 0,
  };
}

export interface BoardRow {
  vehicleId: string;
  name: string;
  status: VehicleStatus;
  cells: { hour24: number; status: SlotStatus }[];
}

export async function getBoard(dateISO: string): Promise<{ hours: number[]; rows: BoardRow[] }> {
  const [vehicles, business, branch] = await Promise.all([listVehicles(), getBusiness(), defaultBranch()]);
  const { open, close } = branch.working;
  const bufferMs = business.bufferMinutes * 60 * 1000;
  const now = Date.now();
  const earliest = now + business.nowLeadHours * 60 * 60 * 1000;
  const hours: number[] = [];
  for (let h = open; h < close; h++) hours.push(h);

  const overlaps = (aS: number, aE: number, bS: number, bE: number) => aS < bE && bS < aE;

  // one query for every vehicle, only intervals touching this day (± the buffer)
  const dayStart = cairoDateTime(dateISO, 0);
  const busyByVehicle = await getBusyForVehicles(
    vehicles.map((v) => v.id),
    new Date(dayStart.getTime() - bufferMs),
    new Date(cairoDateTime(nextDateISO(dateISO), 0).getTime() + bufferMs),
  );

  const rows: BoardRow[] = [];
  for (const v of vehicles) {
    const bookable = v.status !== "inactive" && v.status !== "maintenance";
    const raw = busyByVehicle.get(v.id) ?? []; // actual reservations/blocks, unpadded
    const rawMs = raw.map((iv) => ({ s: iv.start.getTime(), e: iv.end.getTime() }));
    const cells = hours.map((h) => {
      const start = cairoDateTime(dateISO, h).getTime();
      const end = start + 60 * 60 * 1000;
      let status: SlotStatus;
      if (!bookable) status = "unavailable";
      else if (rawMs.some((b) => overlaps(start, end, b.s, b.e))) status = "booked";
      else if (rawMs.some((b) => overlaps(start, end, b.s - bufferMs, b.e + bufferMs))) status = "buffer";
      else if (start < earliest) status = "unavailable";
      else status = "available";
      return { hour24: h, status };
    });
    rows.push({ vehicleId: v.id, name: v.name, status: v.status, cells });
  }
  return { hours, rows };
}
