/**
 * In-memory seed store — the DEV/demo backend used when DATABASE_URL is unset.
 * It mirrors migrations/0002_seed.sql and runs the SAME availability & pricing
 * engines as production. Fleet/category/pricing/settings are mutable so the admin
 * panel works in dev; changes persist for the life of the server process only.
 * Production uses Postgres (repo.ts) where changes are durable.
 */
import type { PricingRule, PromoInput, Quote } from "@/engines/pricing";
import type {
  BlockDTO,
  BlockInput,
  BookingDTO,
  BranchDTO,
  BusinessSettings,
  BusyInterval,
  CategoryDTO,
  CategoryInput,
  CouponDTO,
  CouponInput,
  CreateBookingInput,
  DeliveryOrderDTO,
  DeliveryOrderInput,
  DeliveryOrderStatus,
  DriverPayoutDTO,
  DriverPayoutInput,
  ExpenseDTO,
  ExpenseInput,
  DocumentDTO,
  DocumentInput,
  PaymentDTO,
  PaymentInput,
  StaffDTO,
  StaffInput,
  StaffRole,
  VehicleDetail,
  VehicleEditData,
  VehicleInput,
  VehicleListItem,
  VehiclePricingInput,
} from "./types";
import type { VehicleKind, VehicleStatus } from "@/lib/constants";
import { BLOCKING_STATUSES, DEFAULTS, newBookingCode } from "@/lib/constants";
import { cairoDateISO, cairoDateTime } from "@/lib/time";

interface MemVehicle {
  id: string;
  categoryId: string;
  branchId: string;
  name: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  transmission: string | null;
  fuel: string | null;
  seats: number | null;
  cargoKg: number | null;
  hasDriverOption: boolean;
  status: VehicleStatus;
  images: string[];
}

interface MemBooking {
  code: string;
  vehicleId: string;
  branchId: string;
  startsAt: Date;
  endsAt: Date;
  status: (typeof BLOCKING_STATUSES)[number] | "completed" | "cancelled";
  withDriver: boolean;
  delivery: boolean;
  loaders: number;
  driverId: string | null;
  source: "customer" | "agent";
  agentName: string | null;
  priceSnapshot: Quote;
  contactName: string;
  contactPhone: string;
}
interface MemCoupon { id: string; code: string; type: "pct" | "fixed"; value: number; minValue: number; validTo: string | null; maxUses: number | null; used: number; active: boolean }
interface MemPayment { id: string; bookingCode: string; method: "cash" | "card" | "online"; kind: "rent" | "deposit"; amount: number; status: "paid" | "refunded"; note: string | null; createdAt: Date }
interface MemDocument { id: string; phone: string; type: "national_id" | "license"; url: string; expiry: string | null; createdAt: Date }

interface OtpRec { phone: string; codeHash: string; expiresAt: Date; attempts: number; consumed: boolean; createdAt: Date }
interface UserRec { id: string; phone: string; name: string | null }
interface MemBlock { id: string; vehicleId: string; startsAt: Date; endsAt: Date; reason: "maintenance" | "block"; note: string | null }
interface StaffRec { id: string; name: string; phone: string; role: string }

interface MemState {
  branch: BranchDTO;
  categories: CategoryDTO[];
  vehicles: MemVehicle[];
  pricing: Record<string, PricingRule>; // per-vehicle overrides
  globalRule: PricingRule;
  business: BusinessSettings;
  bookings: MemBooking[];
  blocks: MemBlock[];
  staff: StaffRec[];
  payments: MemPayment[];
  documents: MemDocument[];
  coupons: MemCoupon[];
  deliveryOrders: DeliveryOrderDTO[];
  driverPayouts: DriverPayoutDTO[];
  expenses: ExpenseDTO[];
  otps: OtpRec[];
  users: UserRec[];
}

const GLOBAL_RULE: PricingRule = {
  tiers: [
    { hours: 1, price: 25000 },
    { hours: 2, price: 45000 },
    { hours: 4, price: 80000 },
    { hours: 8, price: 150000 },
  ],
  dailyPrice: 300000,
  extraHourPrice: 25000,
  weekendMultiplier: 1,
  peakMultiplier: 1,
  peakWindow: null,
  holidayMultiplier: 1,
  holidayDates: [],
  driverFeePerHour: 5000,
  loaderFeePerPerson: 8000,
  perKmPrice: 500,
  deliveryFee: 10000,
  deposit: 50000,
  minHours: 2,
  maxHours: 336,
};

const VAN_LARGE_RULE: PricingRule = {
  tiers: [
    { hours: 1, price: 35000 },
    { hours: 2, price: 65000 },
    { hours: 4, price: 120000 },
    { hours: 8, price: 220000 },
  ],
  dailyPrice: 450000,
  extraHourPrice: 35000,
  weekendMultiplier: 1.15,
  peakMultiplier: 1,
  peakWindow: null,
  holidayMultiplier: 1,
  holidayDates: [],
  driverFeePerHour: 7000,
  loaderFeePerPerson: 10000,
  perKmPrice: 700,
  deliveryFee: 15000,
  deposit: 80000,
  minHours: 2,
  maxHours: 336,
};

const BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const VAN_LARGE_ID = "33333333-0000-0000-0000-000000000012";
const DRIVER_ID = "aaaa1111-0000-0000-0000-000000000003";

function seedState(): MemState {
  const today = cairoDateISO(new Date());
  const tomorrow = cairoDateISO(new Date(Date.now() + 24 * 60 * 60 * 1000));
  return {
    branch: {
      id: BRANCH_ID,
      name: "فرع أكتوبر",
      address: "٦ أكتوبر، الجيزة",
      lat: 29.9668,
      lng: 30.9476,
      working: { open: 8, close: 22 },
    },
    categories: [
      { id: "22222222-0000-0000-0000-0000000000a4", kind: "pickup", name: "تروسكل", sort: 1, sizeCode: "XS", capacityKg: 500, dims: "190×130×50", description: "طرود صغيرة، صناديق بقالة، وثائق", image: "/vehicles/pickup-single.svg", baseFare: 5000, perKm: 500 },
      { id: "22222222-0000-0000-0000-0000000000a1", kind: "van", name: "سوزوكي فان", sort: 2, sizeCode: "S", capacityKg: 700, dims: "170×160×100", description: "صناديق صغيرة، كراسي، ثلاجات", image: "/vehicles/van-medium.svg", baseFare: 7000, perKm: 600 },
      { id: "22222222-0000-0000-0000-0000000000a2", kind: "pickup", name: "دبابه", sort: 3, sizeCode: "M", capacityKg: 1300, dims: "300×200×200", description: "أريكة كبيرة، صناديق نقل", image: "/vehicles/pickup-double.svg", baseFare: 10000, perKm: 800 },
      { id: "22222222-0000-0000-0000-0000000000a3", kind: "pickup", name: "جامبو", sort: 4, sizeCode: "L", capacityKg: 5000, dims: "450×250×220", description: "نقل تقيل، انتقالات كبيرة", image: "/vehicles/van-large.svg", baseFare: 15000, perKm: 1200 },
    ],
    vehicles: [
      {
        id: "33333333-0000-0000-0000-000000000001",
        categoryId: "22222222-0000-0000-0000-0000000000a2",
        branchId: BRANCH_ID,
        name: "بيك أب دبل كابينة",
        plate: "ن ص ر 1234",
        brand: "Toyota", model: "Hilux", year: 2022, color: "أبيض",
        transmission: "manual", fuel: "diesel", seats: 5, cargoKg: 1000,
        hasDriverOption: true, status: "available", images: ["/vehicles/pickup-double.svg"],
      },
      {
        id: "33333333-0000-0000-0000-000000000002",
        categoryId: "22222222-0000-0000-0000-0000000000a1",
        branchId: BRANCH_ID,
        name: "بيك أب كابينة",
        plate: "ب ح ر 5678",
        brand: "Isuzu", model: "D-Max", year: 2021, color: "فضي",
        transmission: "manual", fuel: "diesel", seats: 3, cargoKg: 1200,
        hasDriverOption: true, status: "available", images: ["/vehicles/pickup-single.svg"],
      },
      {
        id: "33333333-0000-0000-0000-000000000011",
        categoryId: "22222222-0000-0000-0000-0000000000a3",
        branchId: BRANCH_ID,
        name: "فان متوسط",
        plate: "ق ط ر 4321",
        brand: "Hyundai", model: "H1", year: 2023, color: "رمادي",
        transmission: "automatic", fuel: "benzine", seats: 9, cargoKg: 800,
        hasDriverOption: true, status: "available", images: ["/vehicles/van-medium.svg"],
      },
      {
        id: VAN_LARGE_ID,
        categoryId: "22222222-0000-0000-0000-0000000000a4",
        branchId: BRANCH_ID,
        name: "فان كبير",
        plate: "م ص ر 8765",
        brand: "Mercedes", model: "Sprinter", year: 2022, color: "أبيض",
        transmission: "manual", fuel: "diesel", seats: 14, cargoKg: 1500,
        hasDriverOption: true, status: "maintenance", images: ["/vehicles/van-large.svg"],
      },
    ],
    pricing: { [VAN_LARGE_ID]: VAN_LARGE_RULE },
    globalRule: GLOBAL_RULE,
    business: { ...DEFAULTS, durationOptions: [...DEFAULTS.durationOptions] },
    bookings: [
      {
        code: "10001",
        vehicleId: "33333333-0000-0000-0000-000000000001",
        branchId: BRANCH_ID,
        startsAt: cairoDateTime(tomorrow, 10),
        endsAt: cairoDateTime(tomorrow, 14),
        status: "confirmed", withDriver: true, delivery: false, loaders: 0, driverId: DRIVER_ID, source: "customer", agentName: null,
        priceSnapshot: {
          hours: 4, lines: [{ key: "base", labelAr: "سعر العربية", amount: 80000 }],
          subtotal: 80000, discount: 0, vat: 0, total: 80000, deposit: 50000, currency: "EGP",
        },
        contactName: "محمد علي", contactPhone: "+201001112233",
      },
      {
        code: "10002",
        vehicleId: "33333333-0000-0000-0000-000000000011",
        branchId: BRANCH_ID,
        startsAt: cairoDateTime(tomorrow, 9),
        endsAt: cairoDateTime(tomorrow, 11),
        status: "confirmed", withDriver: true, delivery: true, loaders: 2, driverId: DRIVER_ID, source: "customer", agentName: null,
        priceSnapshot: {
          hours: 2,
          lines: [
            { key: "base", labelAr: "سعر العربية", amount: 45000 },
            { key: "driver", labelAr: "السائق", amount: 10000 },
          ],
          subtotal: 55000, discount: 0, vat: 0, total: 55000, deposit: 50000, currency: "EGP",
        },
        contactName: "سارة محمود", contactPhone: "+201007778899",
      },
      {
        code: "10003",
        vehicleId: "33333333-0000-0000-0000-000000000002",
        branchId: BRANCH_ID,
        startsAt: cairoDateTime(today, 16),
        endsAt: cairoDateTime(today, 20),
        status: "confirmed", withDriver: true, delivery: false, loaders: 0, driverId: DRIVER_ID, source: "agent", agentName: "منى الحجوزات",
        priceSnapshot: {
          hours: 4,
          lines: [
            { key: "base", labelAr: "سعر العربية", amount: 80000 },
            { key: "driver", labelAr: "السائق", amount: 20000 },
          ],
          subtotal: 100000, discount: 0, vat: 0, total: 100000, deposit: 50000, currency: "EGP",
        },
        contactName: "خالد فؤاد", contactPhone: "+201002223344",
      },
    ],
    blocks: [],
    staff: [
      { id: "aaaa1111-0000-0000-0000-000000000001", name: "أحمد المدير", phone: "+201000000001", role: "super_admin" },
      { id: "aaaa1111-0000-0000-0000-000000000002", name: "منى الحجوزات", phone: "+201000000002", role: "agent" },
      { id: "aaaa1111-0000-0000-0000-000000000003", name: "سعيد السائق", phone: "+201000000003", role: "driver" },
    ],
    payments: [],
    documents: [],
    coupons: [
      { id: "cccc1111-0000-0000-0000-000000000001", code: "ترحيب", type: "fixed", value: 5000, minValue: 20000, validTo: null, maxUses: null, used: 0, active: true },
      { id: "cccc1111-0000-0000-0000-000000000002", code: "خصم10", type: "pct", value: 10, minValue: 0, validTo: null, maxUses: null, used: 0, active: true },
    ],
    deliveryOrders: [
      {
        code: "50001",
        categoryId: "22222222-0000-0000-0000-0000000000a2",
        sizeName: "دبابه", sizeCode: "M",
        pickupAddress: "٦ أكتوبر — الحي الأول", dropoffAddress: "الشيخ زايد — بوابة ٢",
        pickupLat: 29.9716, pickupLng: 30.9426, dropoffLat: 30.03, dropoffLng: 30.976,
        km: 9.5, loaders: 1, scheduledAt: cairoDateTime(today, 11),
        status: "assigned", driverId: DRIVER_ID, driverName: "سعيد السائق", driverFee: 9000, rating: null, ratingComment: null,
        priceSnapshot: {
          hours: 0,
          lines: [
            { key: "base", labelAr: "رسوم التوصيل الأساسية", amount: 10000 },
            { key: "km", labelAr: "المسافة (9.5 كم)", amount: 7600 },
          ],
          subtotal: 17600, discount: 0, vat: 0, total: 17600, deposit: 0, currency: "EGP",
        },
        contactName: "محمد علي", contactPhone: "+201001112233", createdAt: new Date(),
      },
      {
        code: "50002",
        categoryId: "22222222-0000-0000-0000-0000000000a1",
        sizeName: "سوزوكي فان", sizeCode: "S",
        pickupAddress: "فيصل — محطة المريوطية", dropoffAddress: "الهرم — شارع الطالبية",
        pickupLat: 29.996, pickupLng: 31.153, dropoffLat: 29.987, dropoffLng: 31.17,
        km: 4.2, loaders: 0, scheduledAt: cairoDateTime(tomorrow, 15),
        status: "assigned", driverId: DRIVER_ID, driverName: "سعيد السائق", driverFee: 5000, rating: null, ratingComment: null,
        priceSnapshot: {
          hours: 0,
          lines: [
            { key: "base", labelAr: "رسوم التوصيل الأساسية", amount: 7000 },
            { key: "km", labelAr: "المسافة (4.2 كم)", amount: 2520 },
          ],
          subtotal: 9520, discount: 0, vat: 0, total: 9520, deposit: 0, currency: "EGP",
        },
        contactName: "سارة محمود", contactPhone: "+201007778899", createdAt: new Date(),
      },
    ],
    driverPayouts: [],
    expenses: [],
    otps: [],
    users: [],
  };
}

const g = globalThis as unknown as { __naqla?: MemState };
if (!g.__naqla) g.__naqla = seedState();
const state = g.__naqla;
// Backfill collections added in later versions — dev hot-reload keeps the old
// state object, so guard against fields that didn't exist when it was created.
state.blocks ??= [];
state.payments ??= [];
state.documents ??= [];
state.coupons ??= [
  { id: "cccc1111-0000-0000-0000-000000000001", code: "ترحيب", type: "fixed", value: 5000, minValue: 20000, validTo: null, maxUses: null, used: 0, active: true },
  { id: "cccc1111-0000-0000-0000-000000000002", code: "خصم10", type: "pct", value: 10, minValue: 0, validTo: null, maxUses: null, used: 0, active: true },
];
state.deliveryOrders ??= [];
state.driverPayouts ??= [];
state.expenses ??= [];
state.staff ??= [
  { id: "aaaa1111-0000-0000-0000-000000000001", name: "أحمد المدير", phone: "+201000000001", role: "super_admin" },
  { id: "aaaa1111-0000-0000-0000-000000000002", name: "منى الحجوزات", phone: "+201000000002", role: "agent" },
  { id: "aaaa1111-0000-0000-0000-000000000003", name: "سعيد السائق", phone: "+201000000003", role: "driver" },
];
// Ensure a sample driver exists even if `staff` predates the driver seed.
if (!state.staff.some((s) => s.role === "driver")) {
  state.staff.push({ id: "aaaa1111-0000-0000-0000-000000000003", name: "سعيد السائق", phone: "+201000000003", role: "driver" });
}

function ruleFor(vehicleId: string): PricingRule {
  return state.pricing[vehicleId] ?? state.globalRule;
}

function fromHourly(rule: PricingRule): number {
  const one = rule.tiers.find((t) => t.hours === 1);
  if (one) return one.price;
  return Math.min(...rule.tiers.map((t) => Math.round(t.price / t.hours)));
}

function catName(id: string): string {
  return state.categories.find((c) => c.id === id)?.name ?? "";
}
function catKind(id: string): VehicleKind {
  return state.categories.find((c) => c.id === id)?.kind ?? "pickup";
}

function toListItem(v: MemVehicle): VehicleListItem {
  return {
    id: v.id,
    name: v.name,
    kind: catKind(v.categoryId),
    categoryId: v.categoryId,
    categoryName: catName(v.categoryId),
    seats: v.seats,
    cargoKg: v.cargoKg,
    status: v.status,
    primaryImage: v.images[0] ?? null,
    fromHourlyPiastres: fromHourly(ruleFor(v.id)),
    branchId: v.branchId,
    branchName: state.branch.name,
  };
}

function ruleToPricingInput(rule: PricingRule): VehiclePricingInput {
  const tier = (h: number) => rule.tiers.find((t) => t.hours === h)?.price ?? 0;
  return {
    hour1: tier(1),
    hour2: tier(2),
    hour4: tier(4),
    hour8: tier(8),
    daily: rule.dailyPrice,
    extraHour: rule.extraHourPrice,
    deposit: rule.deposit,
    driverFeePerHour: rule.driverFeePerHour,
    loaderFeePerPerson: rule.loaderFeePerPerson,
    perKmPrice: rule.perKmPrice,
    deliveryFee: rule.deliveryFee,
  };
}

function pricingInputToRule(p: VehiclePricingInput, base: PricingRule): PricingRule {
  const tiers = [
    { hours: 1, price: p.hour1 },
    { hours: 2, price: p.hour2 },
    { hours: 4, price: p.hour4 },
    { hours: 8, price: p.hour8 },
  ].filter((t) => t.price > 0);
  return {
    ...base,
    tiers,
    dailyPrice: p.daily,
    extraHourPrice: p.extraHour,
    deposit: p.deposit,
    driverFeePerHour: p.driverFeePerHour,
    loaderFeePerPerson: p.loaderFeePerPerson,
    perKmPrice: p.perKmPrice,
    deliveryFee: p.deliveryFee,
    minHours: state.business.minHours,
    maxHours: state.business.maxHours,
  };
}

export const memRepo = {
  // ---------- reads ----------
  listCategories: async (): Promise<CategoryDTO[]> => state.categories.slice().sort((a, b) => a.sort - b.sort),

  defaultBranch: async (): Promise<BranchDTO> => state.branch,
  getBranch: async (id: string): Promise<BranchDTO | null> => (id === state.branch.id ? state.branch : null),
  listBranches: async (): Promise<BranchDTO[]> => [state.branch],

  getBusiness: async (): Promise<BusinessSettings> => state.business,

  listVehicles: async (kind?: VehicleKind): Promise<VehicleListItem[]> =>
    state.vehicles.filter((v) => (kind ? catKind(v.categoryId) === kind : true)).map(toListItem),

  getVehicle: async (id: string): Promise<VehicleDetail | null> => {
    const v = state.vehicles.find((x) => x.id === id);
    if (!v) return null;
    const base = toListItem(v);
    return {
      ...base,
      brand: v.brand, model: v.model, year: v.year, color: v.color,
      transmission: v.transmission, fuel: v.fuel, hasDriverOption: v.hasDriverOption,
      images: v.images, rule: ruleFor(v.id),
    };
  },

  getVehicleForEdit: async (id: string): Promise<VehicleEditData | null> => {
    const v = state.vehicles.find((x) => x.id === id);
    if (!v) return null;
    const detail = await memRepo.getVehicle(id);
    if (!detail) return null;
    return { ...detail, plate: v.plate, categoryId: v.categoryId, pricing: ruleToPricingInput(ruleFor(id)) };
  },

  resolveRule: async (vehicleId: string): Promise<PricingRule> => ruleFor(vehicleId),

  defaultPricingInput: async (): Promise<VehiclePricingInput> => ruleToPricingInput(state.globalRule),

  isVehicleBookable: async (vehicleId: string): Promise<boolean> => {
    const v = state.vehicles.find((x) => x.id === vehicleId);
    return !!v && v.status !== "inactive" && v.status !== "maintenance";
  },

  getBusy: async (vehicleId: string): Promise<BusyInterval[]> => {
    const fromBookings = state.bookings
      .filter((b) => b.vehicleId === vehicleId && (BLOCKING_STATUSES as string[]).includes(b.status))
      .map((b) => ({ start: b.startsAt, end: b.endsAt }));
    const fromBlocks = state.blocks
      .filter((bl) => bl.vehicleId === vehicleId)
      .map((bl) => ({ start: bl.startsAt, end: bl.endsAt }));
    return [...fromBookings, ...fromBlocks];
  },

  getBusyExcept: async (vehicleId: string, exceptCode: string): Promise<BusyInterval[]> => {
    const fromBookings = state.bookings
      .filter((b) => b.vehicleId === vehicleId && b.code !== exceptCode && (BLOCKING_STATUSES as string[]).includes(b.status))
      .map((b) => ({ start: b.startsAt, end: b.endsAt }));
    const fromBlocks = state.blocks.filter((bl) => bl.vehicleId === vehicleId).map((bl) => ({ start: bl.startsAt, end: bl.endsAt }));
    return [...fromBookings, ...fromBlocks];
  },

  updateBookingSchedule: async (code: string, endsAt: Date, quote: Quote): Promise<boolean> => {
    const b = state.bookings.find((x) => x.code === code);
    if (!b) return false;
    b.endsAt = endsAt;
    b.priceSnapshot = quote;
    return true;
  },

  // ---------- booking writes ----------
  createBooking: async (input: CreateBookingInput, quote: Quote, branchId: string): Promise<{ code: string }> => {
    const conflict = state.bookings.some(
      (b) =>
        b.vehicleId === input.vehicleId &&
        (BLOCKING_STATUSES as string[]).includes(b.status) &&
        input.startsAt.getTime() < b.endsAt.getTime() &&
        b.startsAt.getTime() < input.endsAt.getTime()
    );
    if (conflict) throw new Error("CONFLICT");
    const code = newBookingCode();
    state.bookings.push({
      code, vehicleId: input.vehicleId, branchId,
      startsAt: input.startsAt, endsAt: input.endsAt, status: "pending",
      withDriver: input.withDriver, delivery: input.delivery, loaders: input.loaders ?? 0, driverId: null,
      source: input.source ?? "customer", agentName: input.agentName ?? null, priceSnapshot: quote,
      contactName: input.contactName, contactPhone: input.contactPhone,
    });
    return { code };
  },

  getBooking: async (code: string): Promise<BookingDTO | null> => {
    const b = state.bookings.find((x) => x.code === code);
    if (!b) return null;
    const v = state.vehicles.find((x) => x.id === b.vehicleId);
    return {
      code: b.code, vehicleId: b.vehicleId, vehicleName: v?.name ?? "",
      primaryImage: v?.images[0] ?? null, branchName: state.branch.name,
      startsAt: b.startsAt, endsAt: b.endsAt,
      hours: Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 3600000),
      status: b.status, withDriver: b.withDriver, delivery: b.delivery, loaders: b.loaders,
      driverId: b.driverId, driverName: b.driverId ? state.staff.find((s) => s.id === b.driverId)?.name ?? null : null,
      source: b.source, agentName: b.agentName,
      priceSnapshot: b.priceSnapshot, contactName: b.contactName, contactPhone: b.contactPhone,
    };
  },

  listBookingsByPhone: async (phone: string): Promise<BookingDTO[]> => {
    const list = state.bookings.filter((b) => b.contactPhone === phone);
    const out: BookingDTO[] = [];
    for (const b of list) {
      const dto = await memRepo.getBooking(b.code);
      if (dto) out.push(dto);
    }
    return out.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  },

  listAllBookings: async (): Promise<BookingDTO[]> => {
    const out: BookingDTO[] = [];
    for (const b of state.bookings) {
      const dto = await memRepo.getBooking(b.code);
      if (dto) out.push(dto);
    }
    return out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  },

  cancelBooking: async (code: string, phone: string): Promise<boolean> => {
    const b = state.bookings.find((x) => x.code === code && x.contactPhone === phone);
    if (!b) return false;
    b.status = "cancelled";
    return true;
  },

  validatePromo: async (code: string, subtotal: number): Promise<PromoInput | null> => {
    const c = state.coupons.find((x) => x.code.trim() === code.trim() && x.active);
    if (!c) return null;
    if (c.validTo && new Date() > new Date(c.validTo + "T23:59:59")) return null;
    if (c.maxUses != null && c.used >= c.maxUses) return null;
    if (subtotal < c.minValue) return null;
    return { code: c.code, type: c.type, value: c.value };
  },

  // ---------- coupons / promo codes ----------
  listCoupons: async (): Promise<CouponDTO[]> => state.coupons.map((c) => ({ ...c })),

  createCoupon: async (input: CouponInput): Promise<{ id: string }> => {
    const code = input.code.trim();
    if (state.coupons.some((c) => c.code.trim() === code)) throw new Error("DUPLICATE_CODE");
    const id = crypto.randomUUID();
    state.coupons.push({
      id, code, type: input.type, value: input.value, minValue: input.minValue,
      validTo: input.validTo ?? null, maxUses: input.maxUses ?? null, used: 0, active: input.active,
    });
    return { id };
  },

  updateCoupon: async (id: string, input: CouponInput): Promise<boolean> => {
    const c = state.coupons.find((x) => x.id === id);
    if (!c) return false;
    const code = input.code.trim();
    if (state.coupons.some((x) => x.id !== id && x.code.trim() === code)) throw new Error("DUPLICATE_CODE");
    c.code = code; c.type = input.type; c.value = input.value; c.minValue = input.minValue;
    c.validTo = input.validTo ?? null; c.maxUses = input.maxUses ?? null; c.active = input.active;
    return true;
  },

  deleteCoupon: async (id: string): Promise<boolean> => {
    state.coupons = state.coupons.filter((c) => c.id !== id);
    return true;
  },

  // ---------- delivery orders (A→B) ----------
  createDeliveryOrder: async (
    input: DeliveryOrderInput,
    quote: Quote,
    sizeName: string,
    sizeCode: string | null
  ): Promise<{ code: string }> => {
    const code = newBookingCode();
    state.deliveryOrders.push({
      code,
      categoryId: input.categoryId,
      sizeName,
      sizeCode,
      pickupAddress: input.pickupAddress ?? null,
      dropoffAddress: input.dropoffAddress ?? null,
      pickupLat: input.pickupLat ?? null,
      pickupLng: input.pickupLng ?? null,
      dropoffLat: input.dropoffLat ?? null,
      dropoffLng: input.dropoffLng ?? null,
      km: input.km,
      loaders: input.loaders,
      scheduledAt: input.scheduledAt,
      status: "new",
      driverId: null,
      driverName: null,
      driverFee: 0,
      rating: null,
      ratingComment: null,
      priceSnapshot: quote,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      createdAt: new Date(),
    });
    return { code };
  },

  listDeliveryOrders: async (): Promise<DeliveryOrderDTO[]> =>
    state.deliveryOrders.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((o) => ({ ...o })),

  listDeliveryOrdersByPhone: async (phone: string): Promise<DeliveryOrderDTO[]> =>
    state.deliveryOrders.filter((o) => o.contactPhone === phone).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((o) => ({ ...o })),

  updateDeliveryOrderStatus: async (code: string, status: DeliveryOrderStatus): Promise<boolean> => {
    const o = state.deliveryOrders.find((x) => x.code === code);
    if (!o) return false;
    o.status = status;
    return true;
  },

  assignDeliveryDriver: async (code: string, driverId: string | null): Promise<boolean> => {
    const o = state.deliveryOrders.find((x) => x.code === code);
    if (!o) return false;
    o.driverId = driverId;
    o.driverName = driverId ? state.staff.find((s) => s.id === driverId)?.name ?? null : null;
    if (driverId) o.status = "assigned";
    return true;
  },

  getDeliveryOrder: async (code: string): Promise<DeliveryOrderDTO | null> => {
    const o = state.deliveryOrders.find((x) => x.code === code);
    return o ? { ...o } : null;
  },

  listDeliveryOrdersByDriver: async (driverId: string): Promise<DeliveryOrderDTO[]> =>
    state.deliveryOrders
      .filter((o) => o.driverId === driverId)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
      .map((o) => ({ ...o })),

  setDriverFee: async (code: string, fee: number): Promise<boolean> => {
    const o = state.deliveryOrders.find((x) => x.code === code);
    if (!o) return false;
    o.driverFee = Math.max(0, Math.round(fee));
    return true;
  },

  // ---------- driver payouts (تسديدات) ----------
  listDriverPayouts: async (): Promise<DriverPayoutDTO[]> =>
    state.driverPayouts.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((p) => ({ ...p })),

  addDriverPayout: async (input: DriverPayoutInput): Promise<{ id: string }> => {
    const id = crypto.randomUUID();
    state.driverPayouts.push({
      id,
      driverId: input.driverId,
      driverName: state.staff.find((s) => s.id === input.driverId)?.name ?? null,
      amount: Math.max(0, Math.round(input.amount)),
      method: input.method,
      note: input.note ?? null,
      createdAt: new Date(),
    });
    return { id };
  },
  deleteDriverPayout: async (id: string): Promise<boolean> => {
    state.driverPayouts = state.driverPayouts.filter((p) => p.id !== id);
    return true;
  },

  // ---------- expenses (نثريات) ----------
  listExpenses: async (): Promise<ExpenseDTO[]> =>
    state.expenses.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((e) => ({ ...e })),

  addExpense: async (input: ExpenseInput): Promise<{ id: string }> => {
    const id = crypto.randomUUID();
    state.expenses.push({
      id,
      amount: Math.max(0, Math.round(input.amount)),
      category: input.category,
      note: input.note ?? null,
      createdAt: new Date(),
    });
    return { id };
  },
  deleteExpense: async (id: string): Promise<boolean> => {
    state.expenses = state.expenses.filter((e) => e.id !== id);
    return true;
  },

  rateDeliveryOrder: async (code: string, phone: string, rating: number, comment: string | null): Promise<boolean> => {
    const o = state.deliveryOrders.find((x) => x.code === code && x.contactPhone === phone);
    if (!o || o.status !== "completed") return false;
    o.rating = Math.max(1, Math.min(5, Math.round(rating)));
    o.ratingComment = comment ?? null;
    return true;
  },

  // ---------- OTP ----------
  saveOtp: async (phone: string, codeHash: string, expiresAt: Date) => {
    state.otps.push({ phone, codeHash, expiresAt, attempts: 0, consumed: false, createdAt: new Date() });
  },
  latestOtp: async (phone: string) => {
    const list = state.otps.filter((o) => o.phone === phone && !o.consumed).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list[0] ?? null;
  },
  bumpOtpAttempt: async (phone: string) => {
    const o = await memRepo.latestOtp(phone);
    if (o) o.attempts += 1;
  },
  consumeOtp: async (phone: string) => {
    const o = await memRepo.latestOtp(phone);
    if (o) o.consumed = true;
  },
  upsertUser: async (phone: string, name?: string) => {
    let u = state.users.find((x) => x.phone === phone);
    if (!u) {
      u = { id: crypto.randomUUID(), phone, name: name ?? null };
      state.users.push(u);
    } else if (name) u.name = name;
    return u;
  },

  // ---------- ADMIN writes ----------
  createVehicle: async (input: VehicleInput): Promise<{ id: string }> => {
    const plate = input.plate.trim();
    if (state.vehicles.some((v) => v.plate.trim() === plate)) throw new Error("DUPLICATE_PLATE");
    const id = crypto.randomUUID();
    state.vehicles.push({
      id,
      categoryId: input.categoryId,
      branchId: input.branchId ?? state.branch.id,
      name: input.name,
      plate: input.plate,
      brand: input.brand ?? null, model: input.model ?? null, year: input.year ?? null, color: input.color ?? null,
      transmission: input.transmission ?? "manual", fuel: input.fuel ?? "benzine",
      seats: input.seats ?? null, cargoKg: input.cargoKg ?? null,
      hasDriverOption: input.hasDriverOption, status: input.status,
      images: input.imageUrl ? [input.imageUrl] : [],
    });
    state.pricing[id] = pricingInputToRule(input.pricing, state.globalRule);
    return { id };
  },

  updateVehicle: async (id: string, input: VehicleInput): Promise<boolean> => {
    const v = state.vehicles.find((x) => x.id === id);
    if (!v) return false;
    const plate = input.plate.trim();
    if (state.vehicles.some((x) => x.id !== id && x.plate.trim() === plate)) throw new Error("DUPLICATE_PLATE");
    v.categoryId = input.categoryId;
    v.name = input.name;
    v.plate = input.plate;
    v.brand = input.brand ?? null;
    v.model = input.model ?? null;
    v.year = input.year ?? null;
    v.color = input.color ?? null;
    v.transmission = input.transmission ?? v.transmission;
    v.fuel = input.fuel ?? v.fuel;
    v.seats = input.seats ?? null;
    v.cargoKg = input.cargoKg ?? null;
    v.hasDriverOption = input.hasDriverOption;
    v.status = input.status;
    if (input.imageUrl) v.images = [input.imageUrl];
    state.pricing[id] = pricingInputToRule(input.pricing, state.pricing[id] ?? state.globalRule);
    return true;
  },

  setVehicleStatus: async (id: string, status: VehicleStatus): Promise<boolean> => {
    const v = state.vehicles.find((x) => x.id === id);
    if (!v) return false;
    v.status = status;
    return true;
  },

  deleteVehicle: async (id: string): Promise<{ deleted: boolean; deactivated: boolean }> => {
    const hasBookings = state.bookings.some((b) => b.vehicleId === id);
    if (hasBookings) {
      const v = state.vehicles.find((x) => x.id === id);
      if (v) v.status = "inactive";
      return { deleted: false, deactivated: true };
    }
    state.vehicles = state.vehicles.filter((x) => x.id !== id);
    delete state.pricing[id];
    return { deleted: true, deactivated: false };
  },

  createCategory: async (input: CategoryInput): Promise<{ id: string }> => {
    const id = crypto.randomUUID();
    const sort = input.sort ?? (state.categories.reduce((m, c) => Math.max(m, c.sort), 0) + 1);
    state.categories.push({
      id, kind: input.kind, name: input.name, sort,
      sizeCode: input.sizeCode ?? null,
      capacityKg: input.capacityKg ?? null,
      dims: input.dims ?? null,
      description: input.description ?? null,
      image: input.image ?? null,
      baseFare: input.baseFare ?? 0,
      perKm: input.perKm ?? 0,
    });
    return { id };
  },
  updateCategory: async (id: string, input: CategoryInput): Promise<boolean> => {
    const c = state.categories.find((x) => x.id === id);
    if (!c) return false;
    c.name = input.name;
    c.kind = input.kind;
    if (input.sort != null) c.sort = input.sort;
    if (input.sizeCode !== undefined) c.sizeCode = input.sizeCode;
    if (input.capacityKg !== undefined) c.capacityKg = input.capacityKg;
    if (input.dims !== undefined) c.dims = input.dims;
    if (input.description !== undefined) c.description = input.description;
    if (input.image !== undefined) c.image = input.image;
    if (input.baseFare !== undefined) c.baseFare = input.baseFare;
    if (input.perKm !== undefined) c.perKm = input.perKm;
    return true;
  },
  deleteCategory: async (id: string): Promise<{ ok: boolean; reason?: string }> => {
    if (state.vehicles.some((v) => v.categoryId === id)) return { ok: false, reason: "IN_USE" };
    state.categories = state.categories.filter((c) => c.id !== id);
    return { ok: true };
  },

  updateBranch: async (input: Partial<BranchDTO>): Promise<boolean> => {
    Object.assign(state.branch, input);
    return true;
  },
  updateBusiness: async (input: Partial<BusinessSettings>): Promise<boolean> => {
    Object.assign(state.business, input);
    return true;
  },

  // ---------- vehicle availability blocks ----------
  listVehicleBlocks: async (vehicleId: string): Promise<BlockDTO[]> =>
    state.blocks
      .filter((b) => b.vehicleId === vehicleId)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .map((b) => ({ ...b })),

  createVehicleBlock: async (input: BlockInput): Promise<{ id: string }> => {
    const conflict = state.bookings.some(
      (b) =>
        b.vehicleId === input.vehicleId &&
        (BLOCKING_STATUSES as string[]).includes(b.status) &&
        input.startsAt.getTime() < b.endsAt.getTime() &&
        b.startsAt.getTime() < input.endsAt.getTime()
    );
    if (conflict) throw new Error("BLOCK_OVER_BOOKING");
    const id = crypto.randomUUID();
    state.blocks.push({
      id,
      vehicleId: input.vehicleId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      reason: input.reason,
      note: input.note ?? null,
    });
    return { id };
  },

  deleteVehicleBlock: async (id: string): Promise<boolean> => {
    state.blocks = state.blocks.filter((b) => b.id !== id);
    return true;
  },

  // ---------- staff / employees ----------
  listStaff: async (): Promise<StaffDTO[]> => state.staff.map((s) => ({ ...s, role: s.role as StaffRole })),

  createStaff: async (input: StaffInput): Promise<{ id: string }> => {
    const id = crypto.randomUUID();
    state.staff.push({ id, name: input.name, phone: input.phone, role: input.role });
    return { id };
  },

  updateStaffRole: async (id: string, role: StaffRole): Promise<boolean> => {
    const s = state.staff.find((x) => x.id === id);
    if (s) s.role = role;
    return true;
  },

  deleteStaff: async (id: string): Promise<boolean> => {
    state.staff = state.staff.filter((s) => s.id !== id);
    return true;
  },

  listDrivers: async (): Promise<StaffDTO[]> =>
    state.staff.filter((s) => s.role === "driver").map((s) => ({ ...s, role: s.role as StaffRole })),

  /** Resolve a staff member by their login phone (used to identify a driver). */
  getStaffByPhone: async (phone: string): Promise<StaffDTO | null> => {
    const s = state.staff.find((x) => x.phone === phone);
    return s ? { ...s, role: s.role as StaffRole } : null;
  },

  /** All trips assigned to a driver, soonest first. */
  listBookingsByDriver: async (driverId: string): Promise<BookingDTO[]> => {
    const list = state.bookings.filter((b) => b.driverId === driverId);
    const out: BookingDTO[] = [];
    for (const b of list) {
      const dto = await memRepo.getBooking(b.code);
      if (dto) out.push(dto);
    }
    return out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  },

  // ---------- booking lifecycle ----------
  adminUpdateBookingStatus: async (code: string, status: MemBooking["status"]): Promise<boolean> => {
    const b = state.bookings.find((x) => x.code === code);
    if (!b) return false;
    b.status = status;
    return true;
  },
  adminAssignDriver: async (code: string, driverId: string | null): Promise<boolean> => {
    const b = state.bookings.find((x) => x.code === code);
    if (!b) return false;
    b.driverId = driverId;
    return true;
  },

  // ---------- payments ----------
  listPayments: async (bookingCode: string): Promise<PaymentDTO[]> =>
    state.payments
      .filter((p) => p.bookingCode === bookingCode)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((p) => ({ ...p })),

  addPayment: async (input: PaymentInput): Promise<{ id: string }> => {
    const id = crypto.randomUUID();
    state.payments.push({
      id,
      bookingCode: input.bookingCode,
      method: input.method,
      kind: input.kind,
      amount: input.amount,
      status: "paid",
      note: input.note ?? null,
      createdAt: new Date(),
    });
    return { id };
  },
  listAllPayments: async (): Promise<{ amount: number; kind: "rent" | "deposit"; status: "paid" | "refunded"; createdAt: Date }[]> =>
    state.payments.map((p) => ({ amount: p.amount, kind: p.kind, status: p.status, createdAt: p.createdAt })),

  listAllPaymentsFull: async (): Promise<PaymentDTO[]> => state.payments.map((p) => ({ ...p })),

  refundPayment: async (id: string): Promise<boolean> => {
    const p = state.payments.find((x) => x.id === id);
    if (!p) return false;
    p.status = "refunded";
    return true;
  },
  deletePayment: async (id: string): Promise<boolean> => {
    state.payments = state.payments.filter((p) => p.id !== id);
    return true;
  },

  // ---------- documents ----------
  listDocuments: async (phone: string): Promise<DocumentDTO[]> =>
    state.documents
      .filter((d) => d.phone === phone)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((d) => ({ ...d })),

  saveDocument: async (input: DocumentInput): Promise<{ id: string }> => {
    // One current document per type per phone — replace existing.
    state.documents = state.documents.filter((d) => !(d.phone === input.phone && d.type === input.type));
    const id = crypto.randomUUID();
    state.documents.push({
      id,
      phone: input.phone,
      type: input.type,
      url: input.url,
      expiry: input.expiry ?? null,
      createdAt: new Date(),
    });
    return { id };
  },
  deleteDocument: async (id: string): Promise<boolean> => {
    state.documents = state.documents.filter((d) => d.id !== id);
    return true;
  },
};

export type MemRepo = typeof memRepo;
