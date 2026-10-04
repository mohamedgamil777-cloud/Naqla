import Link from "next/link";
import { getBoard } from "@/services/admin-service";
import { cairoDateISO } from "@/lib/time";
import { fullDateLabel, hourLabel } from "@/lib/client-time";
import { VEHICLE_STATUS_LABEL } from "@/lib/constants";
import { BoardDatePicker } from "@/components/admin/BoardDatePicker";
import type { SlotStatus } from "@/engines/availability";

export const dynamic = "force-dynamic";

/** Shift a YYYY-MM-DD date by whole days (anchored at noon UTC to avoid DST edges). */
function shiftISO(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const cellColor: Record<SlotStatus, string> = {
  available: "bg-ok",
  booked: "bg-booked",
  buffer: "bg-rented",
  unavailable: "bg-off/50",
};

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const todayISO = cairoDateISO(new Date());
  const tomorrowISO = shiftISO(todayISO, 1);
  const maxISO = shiftISO(todayISO, 90); // up to 3 months ahead
  const requested = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayISO;
  // Clamp into the allowed window.
  const dateISO = requested < todayISO ? todayISO : requested > maxISO ? maxISO : requested;
  const { hours, rows } = await getBoard(dateISO);

  const prevISO = shiftISO(dateISO, -1);
  const nextISO = shiftISO(dateISO, 1);
  const atStart = dateISO <= todayISO;
  const atEnd = dateISO >= maxISO;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">لوحة المواعيد</h1>
        <div className="flex flex-wrap items-center gap-2">
          <DateTab href={`/admin/board?date=${todayISO}`} active={dateISO === todayISO} label="النهاردة" />
          <DateTab href={`/admin/board?date=${tomorrowISO}`} active={dateISO === tomorrowISO} label="بكرة" />
          {/* prev day (RTL: → points to previous) */}
          <Link
            href={atStart ? "#" : `/admin/board?date=${prevISO}`}
            aria-disabled={atStart}
            className={`w-10 h-10 rounded-xl grid place-items-center text-xl font-extrabold ${atStart ? "bg-panel-2 text-muted pointer-events-none" : "bg-panel border border-line-2"}`}
          >
            →
          </Link>
          <BoardDatePicker date={dateISO} min={todayISO} max={maxISO} />
          <Link
            href={atEnd ? "#" : `/admin/board?date=${nextISO}`}
            aria-disabled={atEnd}
            className={`w-10 h-10 rounded-xl grid place-items-center text-xl font-extrabold ${atEnd ? "bg-panel-2 text-muted pointer-events-none" : "bg-panel border border-line-2"}`}
          >
            ←
          </Link>
        </div>
      </div>
      <p className="text-muted -mt-2">{fullDateLabel(dateISO)} · تقدر تشوف لحد ٣ شهور قدام</p>

      {/* legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <Legend color="bg-ok" label="متاح" />
        <Legend color="bg-booked" label="محجوز" />
        <Legend color="bg-rented" label="تجهيز / فاصل" />
        <Legend color="bg-off/50" label="مش متاح / صيانة" />
      </div>

      <div className="overflow-x-auto border border-line rounded-card bg-panel">
        <table className="border-collapse min-w-[720px] w-full text-center text-sm">
          <thead>
            <tr>
              <th className="sticky start-0 bg-panel-2 text-start p-3 font-bold z-10 min-w-[140px]">العربية</th>
              {hours.map((h) => (
                <th key={h} className="p-2 font-semibold text-muted whitespace-nowrap">{hourLabel(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.vehicleId} className="border-t border-line">
                <td className="sticky start-0 bg-panel text-start p-3 font-bold z-10">
                  {r.name}
                  {r.status !== "available" && (
                    <span className="block text-xs text-muted font-normal">{VEHICLE_STATUS_LABEL[r.status]}</span>
                  )}
                </td>
                {r.cells.map((c) => (
                  <td key={c.hour24} className="p-1.5">
                    <span className={`block w-7 h-6 rounded mx-auto ${cellColor[c.status]}`} title={hourLabel(c.hour24)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted text-sm">قريباً: اضغط على أي خانة لإنشاء حجز أو حظر وقت أو صيانة.</p>
    </div>
  );
}

function DateTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-xl font-semibold ${active ? "bg-primary text-white" : "bg-panel border border-line-2"}`}
    >
      {label}
    </Link>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`w-4 h-4 rounded ${color}`} /> {label}
    </span>
  );
}
