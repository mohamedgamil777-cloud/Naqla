/**
 * Business defaults. Everything here is overridable per-branch or in the
 * `settings` table — these are the seeded starting values (see architecture §14).
 */

export const VEHICLE_KINDS = ["pickup", "van"] as const;
export type VehicleKind = (typeof VEHICLE_KINDS)[number];

export const VEHICLE_STATUSES = [
  "available",
  "reserved",
  "rented",
  "maintenance",
  "inactive",
] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const BOOKING_STATUSES = [
  "pending", // في انتظار التأكيد
  "confirmed", // مؤكد
  "ready", // جاهز للاستلام
  "active", // جاري الإيجار
  "completed", // تم التسليم
  "cancelled", // ملغي
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses that occupy the vehicle and therefore block the time range. */
export const BLOCKING_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "ready",
  "active",
];

export const DEFAULTS = {
  /** Minutes reserved between two rentals (cleaning / refuel / return). §14.2 */
  bufferMinutes: 30,
  /** Minimum rental length in hours. §14.3 */
  minHours: 2,
  /** Maximum rental length in hours (14 days). */
  maxHours: 24 * 14,
  /** How many days ahead a customer may book. §14.5 */
  advanceDays: 30,
  /** "الآن" bookings must start at least this many hours from now. §14.5 */
  nowLeadHours: 1,
  /** Free cancellation until this many hours before pickup. §14.6 */
  freeCancelHours: 6,
  /** Duration options (hours) offered in the wizard, if they fit. */
  durationOptions: [2, 4, 6, 8, 12, 24] as number[],
  /** VAT rate (0 = disabled for MVP). */
  vatRate: 0,
  /** Currency. */
  currency: "EGP",
  timezone: "Africa/Cairo",
} as const;

/** Arabic labels for booking statuses (customer-facing). */
export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "في انتظار التأكيد",
  confirmed: "مؤكد",
  ready: "جاهز للاستلام",
  active: "جاري الإيجار",
  completed: "تم التسليم",
  cancelled: "ملغي",
};

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  available: "متاحة",
  reserved: "محجوزة",
  rented: "مؤجّرة",
  maintenance: "صيانة",
  inactive: "غير متاحة",
};

export const KIND_LABEL: Record<VehicleKind, string> = {
  pickup: "بيك أب",
  van: "فان",
};

/** A generated, human-friendly booking code, e.g. "10254". */
export function newBookingCode(): string {
  // 5-digit code space starting at 10000 for a friendly reference number.
  return String(10000 + Math.floor(Math.random() * 90000));
}
