/** The company's monthly trips report (Excel/CSV): every order of the month with its details. */
import { toCsv } from "@/lib/csv";
import { DELIVERY_STATUS_LABEL } from "@/lib/constants";
import { cairoDateISO } from "@/lib/time";
import type { CompanyStatement } from "@/services/company-service";

const egp = (piastres: number) => (piastres / 100).toFixed(2);
const hhmm = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Cairo" }).format(d);

export const COMPANY_REPORT_HEADERS = [
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

/** Every trip of the month as rows (shown on the page and written to the Excel file). */
export function companyReportRows(st: CompanyStatement): (string | number)[][] {
  return st.allTrips.map((o) => [
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
}

/** The month's totals (label, EGP). */
export function companyReportSummary(st: CompanyStatement): [string, string][] {
  return [
    ["رصيد أول المدة", egp(st.opening)],
    ["رحلات على الحساب", egp(st.charges)],
    ["المدفوع في الشهر", egp(st.paid)],
    ["المستحق آخر المدة", egp(st.closing)],
    ["رحلات اتدفعت كاش", egp(st.cashTotal)],
  ];
}

export function companyReportCsv(st: CompanyStatement): string {
  return toCsv([
    COMPANY_REPORT_HEADERS,
    ...companyReportRows(st),
    [],
    ["ملخص الشهر", st.month],
    ...companyReportSummary(st),
  ]);
}

export function companyReportFilename(st: CompanyStatement): string {
  return `enqelly-${st.month}-trips.csv`;
}
