/** Small timezone-aware helpers safe to run in the browser (Intl-based). */
const TZ = "Africa/Cairo";

/** Cairo calendar date (YYYY-MM-DD) for `offsetDays` from today. */
export function cairoDateISO(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // yyyy-mm-dd
}

/** Human Arabic label for a day option. */
export function dayLabel(offsetDays: number): string {
  if (offsetDays === 0) return "اليوم";
  if (offsetDays === 1) return "غداً";
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(d);
}

/** Arabic label for a full date from an ISO date string. */
export function fullDateLabel(dateISO: string): string {
  const d = new Date(dateISO + "T12:00:00");
  return new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(d);
}

/** 12-hour label with ص/م from a 24h hour. */
export function hourLabel(h24: number): string {
  const suffix = h24 < 12 ? "ص" : "م";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:00 ${suffix}`;
}

/** Arabic duration label. */
export function durationLabel(h: number): string {
  if (h === 24) return "يوم كامل";
  if (h === 1) return "ساعة";
  if (h === 2) return "ساعتين";
  if (h >= 3 && h <= 10) return `${h} ساعات`;
  return `${h} ساعة`;
}
