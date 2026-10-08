/** DTOs returned by the data layer — identical shape from either backend. */
import type { PricingRule } from "@/engines/pricing";
import type { Quote } from "@/engines/pricing";
import type { VehicleKind, VehicleStatus, BookingStatus } from "@/lib/constants";

export type SizeCode = "XS" | "S" | "M" | "L";

export interface CategoryDTO {
  id: string;
  kind: VehicleKind;
  name: string;
  sort: number;
  /** Size tier shown to the customer (null = not a bookable size). */
  sizeCode: SizeCode | null;
  capacityKg: number | null;
  /** Free text, e.g. "190×130×50". */
  dims: string | null;
  /** Short "good for…" description. */
  description: string | null;
  /** Photo/illustration URL (or data URL). */
  image: string | null;
  /** A→B delivery pricing for this size (piastres). */
  baseFare: number;
  perKm: number;
}

export interface VehicleListItem {
  id: string;
  name: string;
  kind: VehicleKind;
  categoryId: string;
  categoryName: string;
  seats: number | null;
  cargoKg: number | null;
  status: VehicleStatus;
  primaryImage: string | null;
  fromHourlyPiastres: number; // cheapest 1h-equivalent tier for the "من X/ساعة" label
  branchId: string;
  branchName: string;
}

export interface VehicleDetail extends VehicleListItem {
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  transmission: string | null;
  fuel: string | null;
  hasDriverOption: boolean;
  images: string[];
  rule: PricingRule;
}

export interface BranchDTO {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  working: { open: number; close: number };
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface BlockDTO {
  id: string;
  vehicleId: string;
  startsAt: Date;
  endsAt: Date;
  reason: "maintenance" | "block";
  note: string | null;
}

export interface BlockInput {
  vehicleId: string;
  startsAt: Date;
  endsAt: Date;
  reason: "maintenance" | "block";
  note?: string | null;
}

export interface BookingDTO {
  code: string;
  vehicleId: string;
  vehicleName: string;
  primaryImage: string | null;
  branchName: string;
  startsAt: Date;
  endsAt: Date;
  hours: number;
  status: BookingStatus;
  withDriver: boolean;
  delivery: boolean;
  loaders: number;
  driverId: string | null;
  driverName: string | null;
  source: BookingSource;
  agentName: string | null;
  priceSnapshot: Quote;
  contactName: string | null;
  contactPhone: string | null;
}

export interface CreateBookingInput {
  vehicleId: string;
  startsAt: Date;
  endsAt: Date;
  withDriver: boolean;
  delivery: boolean;
  loaders: number;
  deliveryAddress?: Record<string, unknown> | null;
  promoCode?: string | null;
  contactName: string;
  contactPhone: string; // E.164
  customerId?: string | null;
  source?: BookingSource;
  agentName?: string | null;
}

export type BookingError = "CONFLICT" | "VEHICLE_BLOCKED" | "VEHICLE_UNAVAILABLE";

export interface BusinessSettings {
  bufferMinutes: number;
  minHours: number;
  maxHours: number;
  advanceDays: number;
  nowLeadHours: number;
  freeCancelHours: number;
  vatRate: number;
  currency: string;
  timezone: string;
  durationOptions: number[];
}

/** Prices in this input are PIASTRES (already converted from EGP by the action). */
export interface VehiclePricingInput {
  hour1: number;
  hour2: number;
  hour4: number;
  hour8: number;
  daily: number;
  extraHour: number;
  deposit: number;
  driverFeePerHour: number;
  loaderFeePerPerson: number;
  perKmPrice: number;
  deliveryFee: number;
}

export type BookingSource = "customer" | "agent";

export interface VehicleInput {
  name: string;
  categoryId: string;
  branchId?: string;
  plate: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  transmission?: string | null;
  fuel?: string | null;
  seats?: number | null;
  cargoKg?: number | null;
  hasDriverOption: boolean;
  status: VehicleStatus;
  imageUrl?: string | null;
  pricing: VehiclePricingInput;
}

export interface CategoryInput {
  kind: VehicleKind;
  name: string;
  sort?: number;
  sizeCode?: SizeCode | null;
  capacityKg?: number | null;
  dims?: string | null;
  description?: string | null;
  image?: string | null;
  baseFare?: number;
  perKm?: number;
}

export type StaffRole = "super_admin" | "fleet_mgr" | "agent" | "driver" | "finance";

export interface StaffDTO {
  id: string;
  name: string;
  phone: string;
  role: StaffRole;
  nationalId: string | null;
  photo: string | null; // personal photo (url / data URL)
  drivingLicense: string | null; // driver only (image)
  vehicleLicense: string | null; // driver only (image)
  available: boolean; // driver's "متاح للعمل" toggle
}

export interface StaffInput {
  name: string;
  phone: string;
  role: StaffRole;
  nationalId?: string | null;
  photo?: string | null;
  drivingLicense?: string | null;
  vehicleLicense?: string | null;
}

export type PaymentMethod = "cash" | "card" | "online";
export type PaymentKind = "rent" | "deposit";
export type PaymentStatus = "paid" | "refunded";

export interface PaymentDTO {
  id: string;
  bookingCode: string;
  method: PaymentMethod;
  kind: PaymentKind;
  amount: number; // piastres
  status: PaymentStatus;
  note: string | null;
  createdAt: Date;
}

export interface PaymentInput {
  bookingCode: string;
  method: PaymentMethod;
  kind: PaymentKind;
  amount: number; // piastres
  note?: string | null;
}

export type CouponType = "pct" | "fixed";

export interface CouponDTO {
  id: string;
  code: string;
  type: CouponType;
  value: number; // pct: 0-100, fixed: piastres
  minValue: number; // min subtotal (piastres) required
  validTo: string | null; // ISO date, null = no expiry
  maxUses: number | null; // null = unlimited
  used: number;
  active: boolean;
}

export interface CouponInput {
  code: string;
  type: CouponType;
  value: number;
  minValue: number;
  validTo?: string | null;
  maxUses?: number | null;
  active: boolean;
}

export type PayoutMethod = "cash" | "bank" | "wallet";

export interface DriverPayoutDTO {
  id: string;
  driverId: string;
  driverName: string | null;
  amount: number; // piastres paid to the driver
  method: PayoutMethod;
  note: string | null;
  createdAt: Date;
}
export interface DriverPayoutInput {
  driverId: string;
  amount: number;
  method: PayoutMethod;
  note?: string | null;
}

export interface ExpenseDTO {
  id: string;
  amount: number; // piastres
  category: string;
  note: string | null;
  createdAt: Date;
}
export interface ExpenseInput {
  amount: number;
  category: string;
  note?: string | null;
}

/** en_route = driving to pickup · arrived = at pickup (loading), then on to drop-off */
export type DeliveryOrderStatus = "new" | "confirmed" | "assigned" | "en_route" | "arrived" | "completed" | "cancelled";

export interface DeliveryOrderDTO {
  code: string;
  categoryId: string;
  sizeName: string; // snapshot of the size class name
  sizeCode: string | null;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  pickupDetails: string | null; // floor / landmark, optional
  dropoffDetails: string | null;
  cargoType: string | null; // what the customer is moving, e.g. "أثاث / أجهزة"
  notes: string | null; // customer notes for the driver
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  km: number;
  loaders: number;
  scheduledAt: Date;
  status: DeliveryOrderStatus;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null; // so the customer can call their assigned driver
  driverFee: number; // piastres the driver earns for this delivery (pre-agreed, by governorate)
  rating: number | null; // 1-5, set by customer after completion
  ratingComment: string | null;
  priceSnapshot: Quote;
  contactName: string | null;
  contactPhone: string | null;
  createdAt: Date;
}

export interface DeliveryOrderInput {
  categoryId: string;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  pickupDetails?: string | null;
  dropoffDetails?: string | null;
  cargoType?: string | null;
  notes?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  km: number;
  loaders: number;
  scheduledAt: Date;
  contactName: string;
  contactPhone: string;
}

export type DocumentType = "national_id" | "license";

export interface DocumentDTO {
  id: string;
  phone: string;
  type: DocumentType;
  url: string;
  expiry: string | null; // ISO date
  createdAt: Date;
}

export interface DocumentInput {
  phone: string;
  type: DocumentType;
  url: string;
  expiry?: string | null;
}

/** Full editable vehicle (for prefilling the admin edit form). */
export interface VehicleEditData extends VehicleDetail {
  plate: string;
  categoryId: string;
  pricing: VehiclePricingInput;
}
