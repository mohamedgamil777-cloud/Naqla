import { repo } from "@/data/repo";
import { cairoDateISO, cairoDateTime } from "@/lib/time";
import type { VehicleStatus } from "@/lib/constants";
import type { BookingDTO } from "@/data/types";
import type { SlotStatus } from "@/engines/availability";

export async function getDashboard() {
  const [vehicles, all, allPayments] = await Promise.all([
    repo.listVehicles(),
    repo.listAllBookings(),
    repo.listAllPayments(),
  ]);
  const counts: Record<VehicleStatus, number> = {
    available: 0,
    reserved: 0,
    rented: 0,
    maintenance: 0,
    inactive: 0,
  };
  for (const v of vehicles) counts[v.status]++;

  const now = Date.now();
  const todayISO = cairoDateISO(new Date());

  const active = all.filter(
    (b) => b.status !== "cancelled" && b.status !== "completed" && b.startsAt.getTime() <= now && b.endsAt.getTime() > now
  );
  const todays = all.filter((b) => cairoDateISO(b.startsAt) === todayISO && b.status !== "cancelled");
  const upcoming = all
    .filter((b) => ["pending", "confirmed", "ready"].includes(b.status) && b.startsAt.getTime() > now)
    .slice(0, 6);
  const cancellations = all.filter((b) => b.status === "cancelled").length;

  // Actual money collected (from recorded payments), not expected booking totals.
  const paidRent = allPayments.filter((p) => p.kind === "rent" && p.status === "paid");
  const collectedTotal = paidRent.reduce((s, p) => s + p.amount, 0);
  const collectedToday = paidRent
    .filter((p) => cairoDateISO(p.createdAt) === todayISO)
    .reduce((s, p) => s + p.amount, 0);
  const depositsHeld = allPayments
    .filter((p) => p.kind === "deposit" && p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);
  // Expected revenue from bookings starting today (for reference).
  const expectedToday = todays.reduce((sum, b) => sum + b.priceSnapshot.total, 0);

  return {
    counts,
    fleetSize: vehicles.length,
    activeRentals: active.length,
    todaysBookings: todays.length,
    collectedToday,
    collectedTotal,
    depositsHeld,
    expectedToday,
    upcoming,
    cancellations,
  };
}

export interface BoardRow {
  vehicleId: string;
  name: string;
  status: VehicleStatus;
  cells: { hour24: number; status: SlotStatus }[];
}

export async function getBoard(dateISO: string): Promise<{ hours: number[]; rows: BoardRow[] }> {
  const [vehicles, business, branch] = await Promise.all([
    repo.listVehicles(),
    repo.getBusiness(),
    repo.defaultBranch(),
  ]);
  const { open, close } = branch.working;
  const bufferMs = business.bufferMinutes * 60 * 1000;
  const now = Date.now();
  const earliest = now + business.nowLeadHours * 60 * 60 * 1000;
  const hours: number[] = [];
  for (let h = open; h < close; h++) hours.push(h);

  const overlaps = (aS: number, aE: number, bS: number, bE: number) => aS < bE && bS < aE;

  const rows: BoardRow[] = [];
  for (const v of vehicles) {
    const bookable = v.status !== "inactive" && v.status !== "maintenance";
    const raw = await repo.getBusy(v.id); // actual reservations/blocks, unpadded
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

export async function listBookingsForAdmin(): Promise<BookingDTO[]> {
  const all = await repo.listAllBookings();
  return all.slice().reverse(); // newest start first-ish
}
