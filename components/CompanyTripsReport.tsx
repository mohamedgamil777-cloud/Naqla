import { monthLabel, type CompanyStatement } from "@/services/company-service";
import { COMPANY_REPORT_HEADERS, companyReportRows, companyReportSummary } from "@/services/company-report";
import { DownloadButton, ReportTable } from "@/components/ReportTable";

/** The month's trips report on screen: totals, every trip as a table, and the Excel download. */
export function CompanyTripsReport({ st, downloadHref }: { st: CompanyStatement; downloadHref: string }) {
  const rows = companyReportRows(st);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">تفاصيل رحلات الشهر</h1>
          <div className="text-ink-2 mt-1">
            {st.company.name} · {monthLabel(st.month)} · {rows.length} رحلة
          </div>
        </div>
        <DownloadButton href={downloadHref} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {companyReportSummary(st).map(([label, value]) => (
          <div key={label} className="rounded-2xl p-3 bg-panel border border-line">
            <div className="text-xs text-muted">{label}</div>
            <div className="text-lg font-extrabold mt-0.5" dir="ltr">
              {value} ج
            </div>
          </div>
        ))}
      </div>
      <ReportTable headers={COMPANY_REPORT_HEADERS} rows={rows} empty="مفيش رحلات في الشهر ده." />
    </div>
  );
}
