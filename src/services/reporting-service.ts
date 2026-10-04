/**
 * Reporting service — assembles every company dataset for the reporting team as
 * flat rows ready for CSV/BI. Money is emitted in EGP. Read-only.
 */
import { repo } from "@/data/repo";
import { BOOKING_STATUS_LABEL, KIND_LABEL, VEHICLE_STATUS_LABEL } from "@/lib/constants";
import { labelDateArabic, labelTime } from "@/lib/time";

export interface Dataset {
  key: string;
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

const egp = (p: number) => (p / 100).toFixed(2);
const yn = (b: boolean) => (b ? "نعم" : "لا");

export async function getDatasets(): Promise<Dataset[]> {
  const [bookings, payments, vehicles, staff, categories] = await Promise.all([
    repo.listAllBookings(),
    repo.listAllPaymentsFull(),
    repo.listVehicles(),
    repo.listStaff(),
    repo.listCategories(),
  ]);

  // Payments indexed by booking.
  const paidByCode = new Map<string, number>();
  const depHeldByCode = new Map<string, number>();
  for (const p of payments) {
    if (p.kind === "rent" && p.status === "paid") paidByCode.set(p.bookingCode, (paidByCode.get(p.bookingCode) ?? 0) + p.amount);
    if (p.kind === "deposit" && p.status === "paid") depHeldByCode.set(p.bookingCode, (depHeldByCode.get(p.bookingCode) ?? 0) + p.amount);
  }

  // ---- bookings (full) ----
  const bookingsDs: Dataset = {
    key: "bookings-full",
    title: "الحجوزات (تفصيلي)",
    headers: [
      "رقم الرحلة", "المصدر", "الموظف", "العربية", "العميل", "الموبايل",
      "تاريخ الاستلام", "ساعة الاستلام", "ساعة التسليم", "المدة (ساعة)", "الحالة",
      "بسائق", "السائق", "توصيل", "عدد العمالة",
      "الإجمالي", "الخصم", "الضريبة", "المدفوع", "المتبقي", "التأمين المحتجز",
    ],
    rows: bookings.map((b) => {
      const paid = paidByCode.get(b.code) ?? 0;
      const due = b.status === "cancelled" ? 0 : b.priceSnapshot.total;
      return [
        b.code,
        b.source === "agent" ? "موظف" : "عميل",
        b.agentName ?? "",
        b.vehicleName,
        b.contactName ?? "",
        b.contactPhone ?? "",
        labelDateArabic(b.startsAt),
        labelTime(b.startsAt),
        labelTime(b.endsAt),
        b.hours,
        BOOKING_STATUS_LABEL[b.status],
        yn(b.withDriver),
        b.driverName ?? "",
        yn(b.delivery),
        b.loaders,
        egp(due),
        egp(b.priceSnapshot.discount ?? 0),
        egp(b.priceSnapshot.vat ?? 0),
        egp(paid),
        egp(Math.max(0, due - paid)),
        egp(depHeldByCode.get(b.code) ?? 0),
      ];
    }),
  };

  // ---- payments ----
  const paymentsDs: Dataset = {
    key: "payments",
    title: "المدفوعات",
    headers: ["رقم الرحلة", "النوع", "الطريقة", "المبلغ", "الحالة", "ملاحظة", "تاريخ التحصيل"],
    rows: payments.map((p) => [
      p.bookingCode,
      p.kind === "deposit" ? "تأمين" : "إيجار",
      p.method === "cash" ? "كاش" : p.method === "card" ? "كارت" : "أونلاين",
      egp(p.amount),
      p.status === "refunded" ? "مسترد" : "مدفوع",
      p.note ?? "",
      labelDateArabic(p.createdAt),
    ]),
  };

  // ---- fleet (full incl. pricing) ----
  const fullVehicles = await Promise.all(vehicles.map((v) => repo.getVehicleForEdit(v.id)));
  const fleetDs: Dataset = {
    key: "fleet",
    title: "الأسطول",
    headers: [
      "الاسم", "اللوحة", "النوع", "الفئة", "الماركة", "الموديل", "السنة", "اللون",
      "ناقل الحركة", "الوقود", "الركاب", "الحمولة (كجم)", "الحالة", "بسائق",
      "سعر الساعة", "ساعتين", "4 ساعات", "8 ساعات", "اليوم", "ساعة إضافية",
      "التأمين", "السائق/ساعة", "العمالة/فرد", "الكيلومتر", "التوصيل",
    ],
    rows: fullVehicles.filter((v): v is NonNullable<typeof v> => !!v).map((v) => [
      v.name, v.plate, KIND_LABEL[v.kind], v.categoryName, v.brand ?? "", v.model ?? "", v.year ?? "", v.color ?? "",
      v.transmission ?? "", v.fuel ?? "", v.seats ?? "", v.cargoKg ?? "", VEHICLE_STATUS_LABEL[v.status], yn(v.hasDriverOption),
      egp(v.pricing.hour1), egp(v.pricing.hour2), egp(v.pricing.hour4), egp(v.pricing.hour8), egp(v.pricing.daily), egp(v.pricing.extraHour),
      egp(v.pricing.deposit), egp(v.pricing.driverFeePerHour), egp(v.pricing.loaderFeePerPerson), egp(v.pricing.perKmPrice), egp(v.pricing.deliveryFee),
    ]),
  };

  // ---- customers (derived) ----
  const custMap = new Map<string, { name: string; trips: number; collected: number }>();
  for (const b of bookings) {
    const phone = b.contactPhone ?? "";
    if (!phone) continue;
    const c = custMap.get(phone) ?? { name: b.contactName ?? "", trips: 0, collected: 0 };
    c.trips += 1;
    c.collected += paidByCode.get(b.code) ?? 0;
    if (!c.name && b.contactName) c.name = b.contactName;
    custMap.set(phone, c);
  }
  const custEntries = [...custMap.entries()];
  const custDocs = await Promise.all(custEntries.map(([phone]) => repo.listDocuments(phone)));
  const customersDs: Dataset = {
    key: "customers",
    title: "العملاء",
    headers: ["الاسم", "الموبايل", "عدد الرحلات", "إجمالي المدفوع", "عنده بطاقة", "عنده رخصة"],
    rows: custEntries.map(([phone, c], i) => {
      const docs = custDocs[i];
      return [
        c.name || "-",
        phone,
        c.trips,
        egp(c.collected),
        yn(docs.some((d) => d.type === "national_id")),
        yn(docs.some((d) => d.type === "license")),
      ];
    }),
  };

  // ---- staff ----
  const roleLabel: Record<string, string> = {
    super_admin: "مدير عام", fleet_mgr: "مدير أسطول", agent: "موظف حجوزات", driver: "سائق", finance: "حسابات",
  };
  const staffDs: Dataset = {
    key: "staff",
    title: "الموظفين",
    headers: ["الاسم", "الموبايل", "الوظيفة"],
    rows: staff.map((s) => [s.name, s.phone, roleLabel[s.role] ?? s.role]),
  };

  // ---- categories ----
  const categoriesDs: Dataset = {
    key: "categories",
    title: "أنواع العربيات",
    headers: ["الاسم", "الفئة"],
    rows: categories.map((c) => [c.name, KIND_LABEL[c.kind]]),
  };

  // ---- vehicle blocks ----
  const blockLists = await Promise.all(vehicles.map((v) => repo.listVehicleBlocks(v.id)));
  const vehName = new Map(vehicles.map((v) => [v.id, v.name]));
  const blockRows: (string | number)[][] = [];
  for (const list of blockLists) {
    for (const bl of list) {
      blockRows.push([
        vehName.get(bl.vehicleId) ?? bl.vehicleId,
        `${labelDateArabic(bl.startsAt)} ${labelTime(bl.startsAt)}`,
        `${labelDateArabic(bl.endsAt)} ${labelTime(bl.endsAt)}`,
        bl.reason === "maintenance" ? "صيانة" : "حجز خاص",
      ]);
    }
  }
  const blocksDs: Dataset = {
    key: "blocks",
    title: "أوقات عدم التوفّر",
    headers: ["العربية", "من", "إلى", "السبب"],
    rows: blockRows,
  };

  return [bookingsDs, paymentsDs, fleetDs, customersDs, staffDs, categoriesDs, blocksDs];
}
