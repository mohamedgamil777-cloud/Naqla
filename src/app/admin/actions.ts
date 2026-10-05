"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { repo } from "@/data/repo";
import { createBooking, extendBooking } from "@/services/booking-service";
import { egpToPiastres } from "@/lib/money";
import { cairoDateTime } from "@/lib/time";
import { toE164 } from "@/lib/phone";
import type { VehicleInput, VehiclePricingInput, StaffRole, PaymentMethod, PaymentKind, CouponInput, CategoryInput, SizeCode, DeliveryOrderStatus } from "@/data/types";
import type { VehicleKind, VehicleStatus, BookingStatus } from "@/lib/constants";

export interface FormState {
  ok: boolean;
  error?: string;
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function numOrNull(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
/** Read an EGP amount from the form and return piastres (0 if empty). */
function egp(fd: FormData, key: string): number {
  const v = str(fd, key);
  if (v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? egpToPiastres(n) : 0;
}

function parseVehicle(fd: FormData): { input: VehicleInput; error?: string } {
  const name = str(fd, "name");
  const plate = str(fd, "plate");
  const categoryId = str(fd, "categoryId");
  if (!name) return { input: {} as VehicleInput, error: "اكتب اسم العربية." };
  if (!plate) return { input: {} as VehicleInput, error: "اكتب رقم اللوحة." };
  if (!categoryId) return { input: {} as VehicleInput, error: "اختار النوع." };

  const pricing: VehiclePricingInput = {
    hour1: egp(fd, "hour1"),
    hour2: egp(fd, "hour2"),
    hour4: egp(fd, "hour4"),
    hour8: egp(fd, "hour8"),
    daily: egp(fd, "daily"),
    extraHour: egp(fd, "extraHour"),
    deposit: egp(fd, "deposit"),
    driverFeePerHour: egp(fd, "driverFee"),
    loaderFeePerPerson: egp(fd, "loaderFee"),
    perKmPrice: egp(fd, "perKm"),
    deliveryFee: egp(fd, "deliveryFee"),
  };
  if (pricing.hour1 <= 0 && pricing.hour2 <= 0 && pricing.hour4 <= 0 && pricing.hour8 <= 0) {
    return { input: {} as VehicleInput, error: "حدد سعر ساعة واحدة على الأقل." };
  }

  const input: VehicleInput = {
    name,
    plate,
    categoryId,
    brand: str(fd, "brand") || null,
    model: str(fd, "model") || null,
    year: numOrNull(fd, "year"),
    color: str(fd, "color") || null,
    transmission: str(fd, "transmission") || "manual",
    fuel: str(fd, "fuel") || "benzine",
    seats: numOrNull(fd, "seats"),
    cargoKg: numOrNull(fd, "cargoKg"),
    hasDriverOption: str(fd, "hasDriverOption") === "on",
    status: (str(fd, "status") || "available") as VehicleStatus,
    imageUrl: str(fd, "imageUrl") || null,
    pricing,
  };
  return { input };
}

export async function saveVehicle(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id");
  const { input, error } = parseVehicle(fd);
  if (error) return { ok: false, error };
  try {
    if (id) await repo.updateVehicle(id, input);
    else await repo.createVehicle(input);
  } catch {
    return { ok: false, error: "حصلت مشكلة أثناء الحفظ. اتأكد إن رقم اللوحة مش متكرر." };
  }
  revalidatePath("/admin/fleet");
  redirect("/admin/fleet");
}

export async function setVehicleStatus(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  const status = str(fd, "status") as VehicleStatus;
  if (id && status) await repo.setVehicleStatus(id, status);
  revalidatePath("/admin/fleet");
  revalidatePath("/admin");
  revalidatePath("/admin/board");
}

export async function deleteVehicle(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  if (id) await repo.deleteVehicle(id);
  revalidatePath("/admin/fleet");
  redirect("/admin/fleet");
}

export async function saveCategory(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id");
  const name = str(fd, "name");
  const kind = str(fd, "kind") as VehicleKind;
  if (!name) return { ok: false, error: "اكتب اسم النوع." };
  if (kind !== "pickup" && kind !== "van") return { ok: false, error: "اختار الفئة." };
  const sizeRaw = str(fd, "sizeCode");
  const sizeCode = (["XS", "S", "M", "L"].includes(sizeRaw) ? sizeRaw : null) as SizeCode | null;
  const input: CategoryInput = {
    name,
    kind,
    sizeCode,
    capacityKg: numOrNull(fd, "capacityKg"),
    dims: str(fd, "dims") || null,
    description: str(fd, "description") || null,
    image: str(fd, "image") || null,
    baseFare: egp(fd, "baseFare"),
    perKm: egp(fd, "perKm"),
  };
  if (id) await repo.updateCategory(id, input);
  else await repo.createCategory(input);
  revalidatePath("/admin/categories");
  revalidatePath("/estimate");
  return { ok: true };
}

export async function renameCategory(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  const name = str(fd, "name");
  const kind = str(fd, "kind") as VehicleKind;
  if (id && name && (kind === "pickup" || kind === "van")) {
    await repo.updateCategory(id, { name, kind });
  }
  revalidatePath("/admin/categories");
  revalidatePath("/admin/fleet");
}

export async function deleteCategory(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  if (id) await repo.deleteCategory(id);
  revalidatePath("/admin/categories");
}

export async function saveCoupon(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id");
  const code = str(fd, "code");
  const type = str(fd, "type") as "pct" | "fixed";
  if (!code) return { ok: false, error: "اكتب كود الكوبون." };
  if (type !== "pct" && type !== "fixed") return { ok: false, error: "اختار نوع الخصم." };
  const rawValue = Number(str(fd, "value"));
  if (!Number.isFinite(rawValue) || rawValue <= 0) return { ok: false, error: "اكتب قيمة الخصم." };
  if (type === "pct" && rawValue > 100) return { ok: false, error: "النسبة لازم تكون من 1 لـ 100." };
  const value = type === "pct" ? Math.round(rawValue) : egpToPiastres(rawValue);
  const maxUses = numOrNull(fd, "maxUses");
  const input: CouponInput = {
    code,
    type,
    value,
    minValue: egp(fd, "minValue"),
    validTo: str(fd, "validTo") || null,
    maxUses: maxUses != null && maxUses > 0 ? Math.round(maxUses) : null,
    active: fd.get("active") != null,
  };
  try {
    if (id) await repo.updateCoupon(id, input);
    else await repo.createCoupon(input);
  } catch (e) {
    if ((e as Error).message === "DUPLICATE_CODE") return { ok: false, error: "الكود ده موجود قبل كده." };
    throw e;
  }
  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function deleteCoupon(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  if (id) await repo.deleteCoupon(id);
  revalidatePath("/admin/coupons");
}

export async function setDeliveryOrderStatus(fd: FormData): Promise<void> {
  const code = str(fd, "code");
  const status = str(fd, "status") as DeliveryOrderStatus;
  const allowed = ["new", "confirmed", "assigned", "completed", "cancelled"];
  if (code && allowed.includes(status)) await repo.updateDeliveryOrderStatus(code, status);
  revalidatePath("/admin/orders");
}

export async function assignDeliveryDriver(fd: FormData): Promise<void> {
  const code = str(fd, "code");
  const driverId = str(fd, "driverId") || null;
  if (code) await repo.assignDeliveryDriver(code, driverId);
  revalidatePath("/admin/orders");
}

export async function saveBranch(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name");
  if (!name) return { ok: false, error: "اكتب اسم الفرع." };
  const open = numOrNull(fd, "open") ?? 8;
  const close = numOrNull(fd, "close") ?? 22;
  if (open < 0 || close > 24 || open >= close) return { ok: false, error: "مواعيد العمل غير صحيحة." };
  await repo.updateBranch({
    name,
    address: str(fd, "address") || null,
    working: { open, close },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/board");
  return { ok: true };
}

// ---------------- vehicle availability blocks ----------------
export async function addVehicleBlock(_prev: FormState, fd: FormData): Promise<FormState> {
  const vehicleId = str(fd, "vehicleId");
  const date = str(fd, "date");
  const from = numOrNull(fd, "from");
  const to = numOrNull(fd, "to");
  const reason = (str(fd, "reason") || "block") as "maintenance" | "block";
  if (!vehicleId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "اختار اليوم." };
  if (from == null || to == null || from < 0 || to > 24 || from >= to) return { ok: false, error: "المواعيد غير صحيحة." };
  try {
    await repo.createVehicleBlock({
      vehicleId,
      startsAt: cairoDateTime(date, from),
      endsAt: cairoDateTime(date, to),
      reason,
    });
  } catch (e) {
    if ((e as Error).message === "BLOCK_OVER_BOOKING") return { ok: false, error: "فيه حجز موجود في الوقت ده، مينفعش تقفله." };
    return { ok: false, error: "حصلت مشكلة، حاول تاني." };
  }
  revalidatePath(`/admin/fleet/${vehicleId}/edit`);
  revalidatePath("/admin/board");
  return { ok: true };
}

export async function deleteVehicleBlock(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  const vehicleId = str(fd, "vehicleId");
  if (id) await repo.deleteVehicleBlock(id);
  if (vehicleId) revalidatePath(`/admin/fleet/${vehicleId}/edit`);
  revalidatePath("/admin/board");
}

// ---------------- agent creates a booking for a customer ----------------
export async function agentCreateBooking(_prev: FormState, fd: FormData): Promise<FormState> {
  const vehicleId = str(fd, "vehicleId");
  const startISO = str(fd, "startISO");
  const hours = numOrNull(fd, "hours") ?? 0;
  const contactName = str(fd, "contactName");
  const rawPhone = str(fd, "contactPhone");
  const agentName = str(fd, "agentName") || null;
  if (!vehicleId) return { ok: false, error: "اختار العربية." };
  if (!startISO) return { ok: false, error: "اختار ميعاد الاستلام." };
  if (hours <= 0) return { ok: false, error: "اختار مدة الإيجار." };
  if (!contactName) return { ok: false, error: "اكتب اسم العميل." };
  let phone: string;
  try {
    phone = toE164(rawPhone);
  } catch {
    return { ok: false, error: "رقم موبايل العميل مش صحيح." };
  }

  let result;
  try {
    result = await createBooking({
      vehicleId,
      startISO,
      hours,
      withDriver: str(fd, "withDriver") === "on",
      withDelivery: str(fd, "withDelivery") === "on",
      loaders: numOrNull(fd, "loaders") ?? 0,
      promoCode: str(fd, "promoCode") || null,
      contactName,
      contactPhone: phone,
      source: "agent",
      agentName,
    });
  } catch {
    return { ok: false, error: "حصلت مشكلة أثناء الحجز، حاول تاني." };
  }
  if (!("code" in result)) {
    return { ok: false, error: "العربية مش متاحة في الوقت ده، جرب ميعاد تاني." };
  }
  // Agent bookings are confirmed on creation (the agent reserved them directly).
  await repo.adminUpdateBookingStatus(result.code, "confirmed");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  redirect(`/admin/bookings/${result.code}`);
}

// ---------------- booking lifecycle ----------------
export async function adminSetBookingStatus(fd: FormData): Promise<void> {
  const code = str(fd, "code");
  const status = str(fd, "status") as BookingStatus;
  const valid: BookingStatus[] = ["pending", "confirmed", "ready", "active", "completed", "cancelled"];
  if (code && valid.includes(status)) await repo.adminUpdateBookingStatus(code, status);
  revalidatePath(`/admin/bookings/${code}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  revalidatePath("/admin/board");
}

export async function extendBookingAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const code = str(fd, "code");
  const hours = numOrNull(fd, "hours") ?? 0;
  if (!code) return { ok: false, error: "حصلت مشكلة." };
  if (hours < 1) return { ok: false, error: "اكتب عدد الساعات الجديد." };
  const res = await extendBooking(code, hours);
  if (!res.ok) {
    const map: Record<string, string> = {
      conflict: "مينفعش تمد الرحلة — فيه حجز تاني بعدها على نفس العربية. جرب مدة أقل.",
      closed: "الرحلة دي خلصت أو ملغية، مينفعش تتعدّل.",
      too_long: "المدة أطول من المسموح بيه.",
      bad_hours: "عدد ساعات غير صحيح.",
      price: "حصلت مشكلة في حساب السعر.",
      not_found: "الحجز مش موجود.",
    };
    return { ok: false, error: map[res.reason] ?? "مش قادر يعدّل الرحلة." };
  }
  revalidatePath(`/admin/bookings/${code}`);
  revalidatePath("/admin/finance");
  revalidatePath("/admin/board");
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminAssignDriver(fd: FormData): Promise<void> {
  const code = str(fd, "code");
  const driverId = str(fd, "driverId") || null;
  if (code) await repo.adminAssignDriver(code, driverId);
  revalidatePath(`/admin/bookings/${code}`);
}

// ---------------- payments ----------------
export async function adminAddPayment(_prev: FormState, fd: FormData): Promise<FormState> {
  const code = str(fd, "code");
  const method = str(fd, "method") as PaymentMethod;
  const kind = str(fd, "kind") as PaymentKind;
  const amount = egp(fd, "amount");
  if (!code) return { ok: false, error: "حصلت مشكلة." };
  if (!["cash", "card", "online"].includes(method)) return { ok: false, error: "اختار طريقة الدفع." };
  if (!["rent", "deposit"].includes(kind)) return { ok: false, error: "اختار نوع الدفعة." };
  if (amount <= 0) return { ok: false, error: "اكتب المبلغ." };
  await repo.addPayment({ bookingCode: code, method, kind, amount, note: str(fd, "note") || null });
  revalidatePath(`/admin/bookings/${code}`);
  return { ok: true };
}

export async function adminRefundPayment(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  const code = str(fd, "code");
  if (id) await repo.refundPayment(id);
  revalidatePath(`/admin/bookings/${code}`);
}

export async function adminDeletePayment(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  const code = str(fd, "code");
  if (id) await repo.deletePayment(id);
  revalidatePath(`/admin/bookings/${code}`);
}

// ---------------- staff / employees ----------------
export async function saveStaff(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name");
  const rawPhone = str(fd, "phone");
  const role = str(fd, "role") as StaffRole;
  const validRoles: StaffRole[] = ["super_admin", "fleet_mgr", "agent", "driver", "finance"];
  if (!name) return { ok: false, error: "اكتب اسم الموظف." };
  if (!validRoles.includes(role)) return { ok: false, error: "اختار الوظيفة." };
  let phone: string;
  try {
    phone = toE164(rawPhone);
  } catch {
    return { ok: false, error: "رقم الموبايل مش صحيح." };
  }
  try {
    await repo.createStaff({ name, phone, role });
  } catch {
    return { ok: false, error: "الرقم ده مضاف قبل كده." };
  }
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function updateStaffRole(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  const role = str(fd, "role") as StaffRole;
  if (id && role) await repo.updateStaffRole(id, role);
  revalidatePath("/admin/staff");
}

export async function deleteStaff(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  if (id) await repo.deleteStaff(id);
  revalidatePath("/admin/staff");
}

export async function saveBusiness(_prev: FormState, fd: FormData): Promise<FormState> {
  const durationOptions = str(fd, "durationOptions")
    .split(/[,،\s]+/)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);
  await repo.updateBusiness({
    bufferMinutes: numOrNull(fd, "bufferMinutes") ?? 30,
    minHours: numOrNull(fd, "minHours") ?? 2,
    maxHours: numOrNull(fd, "maxHours") ?? 336,
    advanceDays: numOrNull(fd, "advanceDays") ?? 30,
    nowLeadHours: numOrNull(fd, "nowLeadHours") ?? 1,
    freeCancelHours: numOrNull(fd, "freeCancelHours") ?? 6,
    vatRate: (numOrNull(fd, "vatPercent") ?? 0) / 100,
    ...(durationOptions.length ? { durationOptions } : {}),
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}
