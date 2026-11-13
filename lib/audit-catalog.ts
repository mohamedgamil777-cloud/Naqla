/**
 * سجل النشاط: what each logged admin action is called in Arabic, and how its before/after
 * fields are shown. Pure data (safe in pages); writing an entry lives in services/audit.ts.
 */
import { formatEgp } from "@/lib/money";
import { BOOKING_STATUS_LABEL, DELIVERY_STATUS_LABEL, VEHICLE_STATUS_LABEL } from "@/lib/constants";

/** Filter groups on the log page. */
export const AUDIT_GROUPS = {
  orders: "الطلبات والحجوزات",
  money: "الفلوس",
  fleet: "العربيات والأنواع",
  people: "الموظفين والعملاء والشركات",
  site: "الموقع والإعدادات",
  login: "الدخول",
} as const;
export type AuditGroup = keyof typeof AUDIT_GROUPS;

type ActionInfo = { label: string; group: AuditGroup; danger?: boolean };

export const AUDIT_ACTIONS = {
  // طلبات التوصيل
  "order.create": { label: "طلب جديد بالتليفون", group: "orders" },
  "order.status": { label: "غيّر حالة طلب", group: "orders" },
  "order.cancel": { label: "لغى طلب", group: "orders", danger: true },
  "order.size": { label: "غيّر حجم العربية في طلب", group: "orders" },
  "order.driver": { label: "عيّن سواق لطلب", group: "orders" },
  "order.driver_fee": { label: "غيّر أجرة السواق في طلب", group: "money" },
  "order.cash": { label: "سجّل استلام كاش طلب", group: "money" },
  "order.cash_undo": { label: "لغى استلام كاش طلب", group: "money", danger: true },
  // الحجوزات
  "booking.create": { label: "حجز جديد", group: "orders" },
  "booking.status": { label: "غيّر حالة حجز", group: "orders" },
  "booking.cancel": { label: "لغى حجز", group: "orders", danger: true },
  "booking.extend": { label: "مدّ مدة حجز", group: "orders" },
  "booking.driver": { label: "عيّن سواق لحجز", group: "orders" },
  "payment.add": { label: "سجّل دفعة على حجز", group: "money" },
  "payment.refund": { label: "رجّع دفعة", group: "money", danger: true },
  "payment.delete": { label: "مسح دفعة", group: "money", danger: true },
  // الحسابات
  "payout.add": { label: "سجّل تسديد لسواق", group: "money" },
  "payout.delete": { label: "مسح تسديد سواق", group: "money", danger: true },
  "expense.add": { label: "سجّل نثرية", group: "money" },
  "expense.delete": { label: "مسح نثرية", group: "money", danger: true },
  // العربيات والأنواع
  "vehicle.create": { label: "ضاف عربية", group: "fleet" },
  "vehicle.update": { label: "عدّل عربية", group: "fleet" },
  "vehicle.status": { label: "غيّر حالة عربية", group: "fleet" },
  "vehicle.delete": { label: "مسح عربية", group: "fleet", danger: true },
  "vehicle.block_add": { label: "قفل عربية فترة", group: "fleet" },
  "vehicle.block_delete": { label: "فتح فترة مقفولة لعربية", group: "fleet" },
  "category.create": { label: "ضاف نوع عربيات", group: "fleet" },
  "category.update": { label: "عدّل نوع / أسعاره", group: "fleet" },
  "category.toggle": { label: "أظهر / أخفى نوع", group: "fleet" },
  "category.delete": { label: "مسح نوع", group: "fleet", danger: true },
  // الناس
  "staff.create": { label: "ضاف موظف", group: "people" },
  "staff.update": { label: "عدّل موظف", group: "people" },
  "staff.role": { label: "غيّر وظيفة موظف", group: "people" },
  "staff.delete": { label: "مسح موظف", group: "people", danger: true },
  "staff.password": { label: "غيّر كلمة سر موظف", group: "people" },
  "customer.password": { label: "غيّر كلمة سر عميل", group: "people" },
  "customer.verify": { label: "أكّد / لغى تأكيد رقم عميل", group: "people" },
  "company.create": { label: "ضاف شركة", group: "people" },
  "company.update": { label: "عدّل شركة", group: "people" },
  "company.member_add": { label: "ضاف مستخدم لشركة", group: "people" },
  "company.member_remove": { label: "شال مستخدم من شركة", group: "people", danger: true },
  "company.member_login": { label: "غيّر دخول مستخدم شركة", group: "people" },
  "company.payment_add": { label: "سجّل دفعة من شركة", group: "money" },
  "company.payment_delete": { label: "مسح دفعة شركة", group: "money", danger: true },
  "company.request": { label: "غيّر حالة طلب حساب شركة", group: "people" },
  "coupon.create": { label: "ضاف كوبون", group: "money" },
  "coupon.update": { label: "عدّل كوبون", group: "money" },
  "coupon.delete": { label: "مسح كوبون", group: "money", danger: true },
  // الموقع والإعدادات
  "content.update": { label: "عدّل محتوى الموقع", group: "site" },
  "settings.branch": { label: "عدّل بيانات الفرع", group: "site" },
  "settings.business": { label: "عدّل إعدادات الشغل", group: "site" },
  // الدخول
  "admin.login": { label: "دخل لوحة الإدارة", group: "login" },
  "admin.logout": { label: "خرج من لوحة الإدارة", group: "login" },
} as const satisfies Record<string, ActionInfo>;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export function auditActionInfo(action: string): ActionInfo {
  return (AUDIT_ACTIONS as Record<string, ActionInfo>)[action] ?? { label: action, group: "site" };
}

export function actionsInGroup(group: AuditGroup): AuditAction[] {
  return (Object.keys(AUDIT_ACTIONS) as AuditAction[]).filter((a) => AUDIT_ACTIONS[a].group === group);
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: "مدير عام",
  fleet_mgr: "مدير أسطول",
  agent: "موظف حجوزات",
  finance: "حسابات",
  driver: "سائق",
  owner: "مدير الشركة",
  member: "موظف",
};
const METHOD_LABEL: Record<string, string> = {
  cash: "كاش",
  card: "كارت",
  bank: "تحويل بنكي",
  wallet: "محفظة",
  instapay: "إنستاباي",
  online: "أونلاين",
};
/** Stored enum words that mean something on their own, whatever the field. */
const WORD_LABEL: Record<string, string> = {
  rent: "إيجار",
  deposit: "تأمين",
  pickup: "بيك أب",
  van: "فان",
  monthly: "شهري",
  pct: "نسبة %",
  fixed: "مبلغ ثابت",
  manual: "مانيوال",
  automatic: "أوتوماتيك",
};

type FieldKind = "money" | "orderStatus" | "bookingStatus" | "vehicleStatus" | "bool" | "role" | "method";
const FIELDS: Record<string, { label: string; kind?: FieldKind }> = {
  status: { label: "الحالة" },
  orderStatus: { label: "الحالة", kind: "orderStatus" },
  bookingStatus: { label: "الحالة", kind: "bookingStatus" },
  vehicleStatus: { label: "الحالة", kind: "vehicleStatus" },
  driver: { label: "السواق" },
  size: { label: "حجم العربية" },
  total: { label: "السعر", kind: "money" },
  driverFee: { label: "أجرة السواق", kind: "money" },
  cash: { label: "الكاش المستلم", kind: "money" },
  amount: { label: "المبلغ", kind: "money" },
  hours: { label: "الساعات" },
  customer: { label: "العميل" },
  phone: { label: "الموبايل" },
  name: { label: "الاسم" },
  role: { label: "الوظيفة", kind: "role" },
  method: { label: "طريقة الدفع", kind: "method" },
  type: { label: "نوع الخصم" },
  minValue: { label: "الحد الأدنى", kind: "money" },
  validTo: { label: "ينتهي في" },
  maxUses: { label: "عدد مرات الاستخدام" },
  nationalId: { label: "الرقم القومي" },
  taxNumber: { label: "الرقم الضريبي" },
  address: { label: "العنوان" },
  discountPct: { label: "الخصم %" },
  billing: { label: "طريقة الحساب" },
  open: { label: "بيفتح الساعة" },
  close: { label: "بيقفل الساعة" },
  bufferMinutes: { label: "الفاصل بين الحجوزات (دقيقة)" },
  minHours: { label: "أقل مدة (ساعة)" },
  maxHours: { label: "أقصى مدة (ساعة)" },
  advanceDays: { label: "أيام الحجز المسبق" },
  nowLeadHours: { label: "مهلة «الآن» (ساعة)" },
  freeCancelHours: { label: "مهلة الإلغاء المجاني (ساعة)" },
  vatPercent: { label: "الضريبة %" },
  durationOptions: { label: "مدد الحجز" },
  password: { label: "كلمة السر" },
  brand: { label: "الماركة" },
  model: { label: "الموديل" },
  year: { label: "سنة الصنع" },
  color: { label: "اللون" },
  seats: { label: "الكراسي" },
  cargoKg: { label: "الحمولة (كجم)" },
  ownerIsDriver: { label: "المالك هو السواق", kind: "bool" },
  ownerNationalId: { label: "الرقم القومي للمالك" },
  hasDriverOption: { label: "متاح بسواق", kind: "bool" },
  transmission: { label: "الفتيس" },
  fuel: { label: "الوقود" },
  dims: { label: "المقاسات" },
  description: { label: "الوصف" },
  image: { label: "الصورة" },
  volumeM3: { label: "حجم الصندوق (م³)" },
  bodyType: { label: "شكل الصندوق" },
  features: { label: "المميزات" },
  sort: { label: "الترتيب" },
  photo: { label: "الصورة" },
  drivingLicense: { label: "رخصة القيادة" },
  vehicleLicense: { label: "رخصة العربية" },
  kind: { label: "النوع" },
  category: { label: "البند" },
  note: { label: "ملاحظة" },
  notes: { label: "ملاحظات" },
  from: { label: "من" },
  to: { label: "إلى" },
  reason: { label: "السبب" },
  plate: { label: "اللوحة" },
  active: { label: "ظاهر", kind: "bool" },
  verified: { label: "متأكد", kind: "bool" },
  baseFare: { label: "فتحة العداد", kind: "money" },
  perKm: { label: "سعر الكيلو", kind: "money" },
  sizeCode: { label: "كود الحجم" },
  capacityKg: { label: "الحمولة (كجم)" },
  ownerName: { label: "اسم المالك" },
  ownerPhone: { label: "موبايل المالك" },
  licenseNumber: { label: "رقم الرخصة" },
  licenseExpiry: { label: "انتهاء الرخصة" },
  code: { label: "الكود" },
  value: { label: "قيمة الخصم" },
  creditLimit: { label: "الحد الائتماني", kind: "money" },
  username: { label: "اسم المستخدم" },
  section: { label: "الجزء" },
  "pricing.hour1": { label: "سعر الساعة", kind: "money" },
  "pricing.hour2": { label: "سعر الساعتين", kind: "money" },
  "pricing.hour4": { label: "سعر 4 ساعات", kind: "money" },
  "pricing.hour8": { label: "سعر 8 ساعات", kind: "money" },
  "pricing.daily": { label: "سعر اليوم", kind: "money" },
  "pricing.extraHour": { label: "الساعة الإضافية", kind: "money" },
  "pricing.deposit": { label: "التأمين", kind: "money" },
  "pricing.driverFeePerHour": { label: "أجر السائق/ساعة", kind: "money" },
  "pricing.loaderFeePerPerson": { label: "أجر العامل", kind: "money" },
  "pricing.perKmPrice": { label: "سعر الكيلو", kind: "money" },
  "pricing.deliveryFee": { label: "رسوم التوصيل", kind: "money" },
};

export function fieldLabel(key: string): string {
  return FIELDS[key]?.label ?? key;
}

/** One stored value as the owner reads it ("—" for empty). */
export function formatAuditValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const kind = FIELDS[key]?.kind;
  if (kind === "money" && typeof value === "number") return formatEgp(value);
  const word = String(value);
  if (kind === "orderStatus") return (DELIVERY_STATUS_LABEL as Record<string, string>)[word] ?? word;
  if (kind === "bookingStatus") return (BOOKING_STATUS_LABEL as Record<string, string>)[word] ?? word;
  if (kind === "vehicleStatus") return (VEHICLE_STATUS_LABEL as Record<string, string>)[word] ?? word;
  if (kind === "role") return ROLE_LABEL[String(value)] ?? String(value);
  if (kind === "method") return METHOD_LABEL[String(value)] ?? String(value);
  if (typeof value === "boolean") return value ? "أيوه" : "لأ";
  if (Array.isArray(value)) return value.join("، ");
  if (typeof value === "object") return JSON.stringify(value);
  return WORD_LABEL[String(value)] ?? String(value);
}

/** Keys in the stored `after` object that describe the entry rather than a field. */
export const AUDIT_META_KEYS = ["_label", "_by"] as const;
