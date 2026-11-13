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

/** One end of the trip: the point picked on the map / in search, its street address, and the extra parts. */
export interface StopState {
  point: LatLng | null;
  /** street address — from Google (search pick or reverse lookup), editable */
  address: string;
  building: string;
  floor: string;
  apartment: string;
  landmark: string;
}

export const emptyStop = (): StopState => ({
  point: null,
  address: "",
  building: "",
  floor: "",
  apartment: "",
  landmark: "",
});

const DETAIL_PARTS = [
  ["building", "عمارة"],
  ["floor", "الدور"],
  ["apartment", "شقة"],
] as const;
const DETAIL_SEP = " · ";

type StopDetails = Pick<StopState, "building" | "floor" | "apartment" | "landmark">;

/** Extra address parts → the single details text orders and saved addresses store
 *  ("عمارة 12 · الدور 3 · شقة 5 · قدام الصيدلية"). */
export function composeDetails(s: StopDetails): string {
  const parts: string[] = DETAIL_PARTS.flatMap(([key, label]) =>
    s[key].trim() ? [`${label} ${s[key].trim()}`] : [],
  );
  if (s.landmark.trim()) parts.push(s.landmark.trim());
  return parts.join(DETAIL_SEP);
}

/** Inverse of composeDetails; anything it can't place (older free text) lands in the landmark. */
export function parseDetails(text: string | null): StopDetails {
  const out: StopDetails = { building: "", floor: "", apartment: "", landmark: "" };
  const rest: string[] = [];
  for (const part of (text ?? "")
    .split(DETAIL_SEP)
    .map((p) => p.trim())
    .filter(Boolean)) {
    const hit = DETAIL_PARTS.find(([key, label]) => !out[key] && part.startsWith(`${label} `));
    const value = hit ? part.slice(hit[1].length + 1).trim() : "";
    // composed values are short single fields; a longer sentence that happens to start with a label is free text
    if (hit && value.length <= 20 && !/[،,]/.test(value)) out[hit[0]] = value;
    else rest.push(part);
  }
  out.landmark = rest.join(DETAIL_SEP);
  return out;
}

export interface SavedAddr {
  id: string;
  label: string;
  address: string;
  details: string | null;
  lat: number | null;
  lng: number | null;
  /** filled in by itself as the pickup on a new order */
  isDefault?: boolean;
}

export interface AccountInfo {
  loggedIn: boolean;
  company: { name: string; discountPct: number; billing: "cash" | "monthly" } | null;
  saved: SavedAddr[];
  /** false for company employees: the company admin manages the shared list */
  canSave?: boolean;
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

export const detailField =
  "w-full rounded-xl border border-line bg-panel px-3.5 py-2 text-[15px] text-ink-2 outline-none transition " +
  "placeholder:text-muted/70 focus:border-primary focus:ring-3 focus:ring-primary/15";

/** Addresses typed on the home page, handed to the order form through sessionStorage. */
export interface OrderDraft {
  pickupAddr: string;
  dropoffAddr: string;
  /** set when the home page's GPS button found the spot — used as-is instead of geocoding the text */
  pickupPoint?: LatLng | null;
  dropoffPoint?: LatLng | null;
}

export const DRAFT_KEY = "naqla_order_draft";

/** Server error codes from POST /api/orders → message, and whether to scroll back to the time step. */
/** Why the server couldn't measure the trip (no price is shown until it can). */
export const ROUTE_ERROR: Record<string, string> = {
  ROUTE_FAILED: "مقدرناش نحسب الطريق بين المكانين دلوقتي. اتأكد إن العنوانين صح أو حرّك الدبوس، وجرّب تاني.",
  ADDRESS_NOT_FOUND: "مقدرناش نلاقي العنوان ده. اختاره من نتايج البحث أو حدده على الخريطة.",
  OUTSIDE_EGYPT: "المكان ده بره مصر. اختار عنوان داخل مصر.",
  NO_POINTS: "حدد مكان الاستلام ومكان التسليم عشان نحسب المسافة والسعر.",
};

export const ORDER_ERROR: Record<string, { text: string; toTime?: boolean; toPlaces?: boolean }> = {
  ROUTE_FAILED: { text: ROUTE_ERROR.ROUTE_FAILED, toPlaces: true },
  ADDRESS_NOT_FOUND: { text: ROUTE_ERROR.ADDRESS_NOT_FOUND, toPlaces: true },
  OUTSIDE_EGYPT: { text: ROUTE_ERROR.OUTSIDE_EGYPT, toPlaces: true },
  NO_POINTS: { text: ROUTE_ERROR.NO_POINTS, toPlaces: true },
  PAST: { text: "الميعاد ده قريب أوي — اختار ميعاد بعد كده عشان نلحق نجهّز العربية.", toTime: true },
  HOURS: { text: "الميعاد ده بره مواعيد الشغل، اختار ساعة تانية.", toTime: true },
  CREDIT: { text: "الطلب ده هيعدّي حد الائتمان المتفق عليه للشركة — كلّموا الإدارة." },
  TOO_FAR: { text: "الميعاد ده بعيد أوي، اختار يوم أقرب.", toTime: true },
};
