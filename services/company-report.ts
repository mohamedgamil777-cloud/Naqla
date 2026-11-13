/** The company's monthly trips report (Excel/CSV): every order of the month with its details. */
import { toCsv } from "@/lib/csv";
import { DELIVERY_STATUS_LABEL } from "@/lib/constants";
import { cairoDateISO } from "@/lib/time";
import type { CompanyStatement } from "@/services/company-service";

const egp = (piastres: number) => (piastres / 100).toFixed(2);
const hhmm = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Cairo" }).format(d);

export function companyReportCsv(st: CompanyStatement): string {
  const header = [
    "التاريخ",
    "الساعة",
    "رقم الطلب",
    "الحالة",
    "من",
    "تفاصيل الاستلام",
    "إلى",
    "تفاصيل التسليم",
    "العربية",
    "الشيالين",
    "المسافة (كم)",
    "طلبها",
    "استلمها",
    "الدفع",
    "المبلغ (جنيه)",
  ];
  const rows = st.allTrips.map((o) => [
    cairoDateISO(o.scheduledAt),
    hhmm(o.scheduledAt),
    o.code,
    DELIVERY_STATUS_LABEL[o.status] ?? o.status,
    o.pickupAddress ?? "",
    o.pickupDetails ?? "",
    o.dropoffAddress ?? "",
    o.dropoffDetails ?? "",
    o.sizeName,
    o.loaders,
    Math.round(o.km * 10) / 10,
    o.contactName ?? "",
    o.podName ?? "",
    o.billing === "account" ? "على الحساب" : "كاش",
    o.status === "cancelled" ? "0.00" : egp(o.priceSnapshot.total),
  ]);
  const summary = [
    [],
    ["ملخص الشهر", st.month],
    ["رصيد أول المدة", egp(st.opening)],
    ["رحلات على الحساب", egp(st.charges)],
    ["المدفوع في الشهر", egp(st.paid)],
    ["المستحق آخر المدة", egp(st.closing)],
    ["رحلات اتدفعت كاش", egp(st.cashTotal)],
  ];
  return toCsv([header, ...rows, ...summary] as (string | number)[][]);
}

export function companyReportFilename(st: CompanyStatement): string {
  return `enqelly-${st.month}-trips.csv`;
}
