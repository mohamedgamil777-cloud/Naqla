import { NextRequest, NextResponse } from "next/server";
import { getFinance } from "@/services/finance-service";
import { getDatasets } from "@/services/reporting-service";
import { BOOKING_STATUS_LABEL } from "@/lib/constants";
import { cairoDateISO } from "@/lib/time";
import { toCsv } from "@/lib/csv";

const egp = (piastres: number) => (piastres / 100).toFixed(2);

const REPORTING_KEYS = ["bookings-full", "payments", "fleet", "customers", "staff", "categories", "blocks"];

function csvResponse(csv: string, name: string, from: string, to: string) {
  const suffix = from && to ? `-${from}_${to}` : "";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="naqla-${name}${suffix}.csv"`,
    },
  });
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const report = q.get("report") ?? "bookings";
  const today = cairoDateISO(new Date());
  const from = /^\d{4}-\d{2}-\d{2}$/.test(q.get("from") ?? "") ? q.get("from")! : today;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(q.get("to") ?? "") ? q.get("to")! : today;

  // ---- Company-wide reporting datasets (full dumps, no date filter) ----
  if (report === "all-data" || REPORTING_KEYS.includes(report)) {
    const datasets = await getDatasets();
    if (report === "all-data") {
      const rows: (string | number)[][] = [];
      for (const ds of datasets) {
        rows.push([`### ${ds.title} (${ds.rows.length}) ###`]);
        rows.push(ds.headers);
        for (const r of ds.rows) rows.push(r);
        rows.push([]);
      }
      return csvResponse(toCsv(rows), "company-full-report", "", "");
    }
    const ds = datasets.find((d) => d.key === report)!;
    return csvResponse(toCsv([ds.headers, ...ds.rows]), report, "", "");
  }

  // ---- Finance reports (date-filtered) ----
  const fin = await getFinance(from, to);
  let rows: (string | number)[][];
  let name: string;

  if (report === "cashflow") {
    name = "cashflow";
    rows = [["التاريخ", "تحصيل إيجار", "تأمين وارد", "تأمين مسترد", "صافي النقدية"]];
    for (const c of fin.cashflow) rows.push([c.dateLabel, egp(c.rentIn), egp(c.depositIn), egp(c.depositOut), egp(c.net)]);
    rows.push([]);
    rows.push([
      "الإجمالي",
      egp(fin.cashflow.reduce((s, c) => s + c.rentIn, 0)),
      egp(fin.cashflow.reduce((s, c) => s + c.depositIn, 0)),
      egp(fin.cashflow.reduce((s, c) => s + c.depositOut, 0)),
      egp(fin.cashflow.reduce((s, c) => s + c.net, 0)),
    ]);
  } else if (report === "revenue-by-vehicle") {
    name = "revenue-by-vehicle";
    rows = [["العربية", "عدد الرحلات", "المحصّل"]];
    for (const v of fin.byVehicle) rows.push([v.name, v.trips, egp(v.collected)]);
  } else {
    name = "bookings";
    rows = [[
      "رقم الرحلة", "تاريخ الرحلة", "العربية", "العميل", "الموبايل", "الحالة", "المصدر",
      "الإجمالي المطلوب", "المدفوع", "المتبقي", "التأمين المحتجز", "التأمين المسترد",
    ]];
    for (const r of fin.rows) {
      rows.push([
        r.code, r.dateLabel, r.vehicle, r.customer, r.phone, BOOKING_STATUS_LABEL[r.status],
        r.source === "agent" ? `موظف${r.agentName ? " - " + r.agentName : ""}` : "عميل",
        egp(r.total), egp(r.paid), egp(r.remaining), egp(r.depositHeld), egp(r.depositRefunded),
      ]);
    }
    rows.push([]);
    rows.push([
      "الإجمالي", "", "", "", "", "", "",
      egp(fin.summary.totalDue), egp(fin.summary.totalPaid), egp(fin.summary.totalRemaining),
      egp(fin.summary.depositsHeld), egp(fin.summary.depositsRefunded),
    ]);
  }

  return csvResponse(toCsv(rows), name, from, to);
}
