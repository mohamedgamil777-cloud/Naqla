/**
 * Time helpers. All persisted instants are UTC (timestamptz); we display and
 * reason about local wall-clock time in Africa/Cairo. We keep the engine working
 * in absolute Date instants so DST transitions never corrupt overlap math.
 */
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const TZ = "Africa/Cairo";

/** Build a UTC instant from a Cairo wall-clock date + hour. */
export function cairoDateTime(dateISO: string, hour: number, minute = 0): Date {
  // dateISO like "2026-09-20". Pass a timezone-naive string so the conversion is
  // independent of the machine's local timezone (Date.UTC would be misread here).
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return fromZonedTime(`${dateISO}T${hh}:${mm}:00`, TZ);
}

/** The Cairo calendar date (YYYY-MM-DD) for an instant. */
export function cairoDateISO(d: Date): string {
  return formatInTimeZone(d, TZ, "yyyy-MM-dd");
}

/** The Cairo hour (0-23) for an instant. */
export function cairoHour(d: Date): number {
  return Number(formatInTimeZone(d, TZ, "H"));
}

/** Cairo weekday: 0 = Sunday ... 6 = Saturday. */
export function cairoWeekday(d: Date): number {
  return toZonedTime(d, TZ).getDay();
}

/** Human time label in Arabic-friendly 12h form, e.g. "10:00 ص". */
export function labelTime(d: Date): string {
  const h24 = cairoHour(d);
  const suffix = h24 < 12 ? "ص" : "م";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:00 ${suffix}`;
}

/** Short HH:00 label (24h) for slot grids. */
export function labelHour24(d: Date): string {
  return `${String(cairoHour(d)).padStart(2, "0")}:00`;
}

/** Arabic long date, e.g. "20 سبتمبر 2026". */
export function labelDateArabic(d: Date): string {
  const months = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ];
  const day = formatInTimeZone(d, TZ, "d");
  const monthIdx = Number(formatInTimeZone(d, TZ, "M")) - 1;
  const year = formatInTimeZone(d, TZ, "yyyy");
  return `${day} ${months[monthIdx]} ${year}`;
}

export const HOUR_MS = 60 * 60 * 1000;

export function addHours(d: Date, h: number): Date {
  return new Date(d.getTime() + h * HOUR_MS);
}

export function addMinutes(d: Date, m: number): Date {
  return new Date(d.getTime() + m * 60 * 1000);
}
