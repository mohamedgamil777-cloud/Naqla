/** Types and pure helpers for the customer delivery order form. */
import type { IconName } from "@/components/Icons";

export interface SizeOpt {
  id: string;
  name: string;
  sizeCode: string;
  capacityKg: number | null;
  dims: string | null;
  description: string | null;
  image: string | null;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Which stop an address/pin belongs to: a = pickup, b = drop-off. */
export type Stop = "a" | "b";

export interface SavedAddr {
  id: string;
  label: string;
  address: string;
  details: string | null;
  lat: number | null;
  lng: number | null;
}

export interface AccountInfo {
  loggedIn: boolean;
  company: { name: string; discountPct: number; billing: "cash" | "monthly" } | null;
  saved: SavedAddr[];
}

export interface OrderOptions {
  /** working hours from admin settings (whole hours, close is exclusive) */
  hours: { open: number; close: number };
  advanceDays: number;
  /** minimum notice before a pickup today (hours, from الإعدادات) */
  leadHours: number;
  maxLoaders: number;
  disclaimer: string;
  /** "what are you moving?" cards → suggested size (admin → محتوى التطبيق) */
  cargo: { label: string; size: string; icon: IconName }[];
}

export const SIZE_BADGE: Record<string, string> = {
  XS: "bg-accent-soft text-accent-ink",
  S: "bg-primary-soft text-primary-ink",
  M: "bg-panel-2 text-ink-2",
  L: "bg-panel-2 text-ink-2",
};

export const STEPS = [
  { id: "sec-places", label: "الأماكن" },
  { id: "sec-time", label: "الميعاد" },
  { id: "sec-vehicle", label: "العربية" },
  { id: "sec-details", label: "التفاصيل" },
];

/** Every 30 min inside working hours (last slot is 30 min before closing). */
export function timeSlots(open: number, close: number): string[] {
  const out: string[] = [];
  for (let m = open * 60; m < close * 60; m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

export function slotMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes since midnight, Cairo time. */
export function cairoNowMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Africa/Cairo",
  }).format(new Date());
  return slotMinutes(parts);
}

export function timeLabel(t: string) {
  const [h, m] = t.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return {
    clock: `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    part: h < 12 ? "صباحاً" : "مساءً",
  };
}

export function dateLabel(iso: string) {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function capacityLabel(kg: number) {
  return `حتى ${kg.toLocaleString("en-US")} كجم`;
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Straight-line distance × 1.3 as a road estimate, to one decimal. */
export function roadKm(a: LatLng, b: LatLng): number {
  return Math.round(haversineKm(a, b) * 1.3 * 10) / 10;
}

/** Address box: clearly an input — border, tinted background, strong focus ring; red when missing. */
export function addrField(missing: boolean) {
  const base =
    "w-full rounded-xl border-2 px-4 py-3.5 text-lg font-semibold text-ink outline-none transition " +
    "placeholder:text-muted/70 placeholder:font-normal placeholder:text-base focus:bg-panel focus:border-primary " +
    "focus:shadow-[0_0_0_4px_var(--color-primary-soft)]";
  return `${base} ${missing ? "border-booked bg-booked-soft/50" : "border-line-2 bg-ground"}`;
}

export const detailField =
  "w-full rounded-xl border border-line bg-panel px-4 py-2.5 text-base text-ink-2 outline-none transition " +
  "placeholder:text-muted/70 focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)]";

/** What the order form keeps in sessionStorage across the login detour. */
export interface OrderDraft {
  pickup: LatLng;
  dropoff: LatLng;
  pickupAddr: string;
  dropoffAddr: string;
  pickupDetails: string;
  dropoffDetails: string;
  notes: string;
  sizeId: string;
  hint: string | null;
  date: string;
  time: string;
  loaders: number;
  promo: string;
}

export const DRAFT_KEY = "naqla_order_draft";

/** Server error codes from POST /api/orders → message, and whether to scroll back to the time step. */
export const ORDER_ERROR: Record<string, { text: string; toTime?: boolean }> = {
  PAST: { text: "الميعاد ده قريب أوي — اختار ميعاد بعد كده عشان نلحق نجهّز العربية.", toTime: true },
  HOURS: { text: "الميعاد ده بره مواعيد الشغل، اختار ساعة تانية.", toTime: true },
  CREDIT: { text: "الطلب ده هيعدّي حد الائتمان المتفق عليه للشركة — كلّموا الإدارة." },
  TOO_FAR: { text: "الميعاد ده بعيد أوي، اختار يوم أقرب.", toTime: true },
};
