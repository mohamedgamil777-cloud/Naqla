import { getDatasetSummaries } from "@/services/reporting-service";
import { requirePermission } from "@/lib/authz";
import Link from "next/link";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requirePermission("report:read");
  // row counts come from the database; the rows themselves are built only when a CSV is exported
  const datasets = await getDatasetSummaries();
  const totalRows = datasets.reduce((s, d) => s + d.rowCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">تقارير الشركة</h1>
        <p className="text-muted text-sm mt-1">
          اعرض أي تقرير هنا على الشاشة، أو نزّله ملف CSV يفتح في Excel مباشرة.
        </p>
      </div>

      {/* Export everything */}
      <div className="bg-primary text-white rounded-card p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-extrabold text-lg">كل بيانات الشركة</div>
          <div className="text-white/80 text-sm">
            {datasets.length} مجموعات بيانات · {totalRows} صف — ملف واحد شامل.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
        <Link href="/admin/reports/all-data" className="rounded-2xl px-6 py-3 font-bold border-2 border-white text-white">
          <Icon name="orders" className="w-4 h-4 inline-block align-[-3px] me-1.5" />عرض الكل
        </Link>
        <a
          href="/api/admin/export?report=all-data"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl px-6 py-3 font-bold bg-white text-primary"
        >
          <Icon name="download" className="w-4 h-4 inline-block align-[-3px] me-1.5" />تصدير الكل (ملف واحد)
        </a>
        </div>
      </div>

      {/* Per-dataset */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {datasets.map((d) => (
          <div key={d.key} className="bg-panel border border-line rounded-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-extrabold text-lg">{d.title}</div>
                <div className="text-muted text-sm">
                  {d.rowCount} صف · {d.headers.length} عمود
                </div>
              </div>
              <span className="flex gap-2">
                <Link
                  href={`/admin/reports/${d.key}`}
                  className="rounded-xl px-4 py-2.5 font-bold border-2 border-primary text-primary whitespace-nowrap"
                >
                  <Icon name="orders" className="w-4 h-4 inline-block align-[-3px] me-1.5" />عرض
                </Link>
                <a
                  href={`/api/admin/export?report=${d.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl px-4 py-2.5 font-bold bg-primary text-white whitespace-nowrap"
                >
                  <Icon name="download" className="w-4 h-4 inline-block align-[-3px] me-1.5" />تصدير
                </a>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {d.headers.slice(0, 10).map((h) => (
                <span key={h} className="text-xs bg-panel-2 text-ink-2 rounded-full px-2 py-0.5">
                  {h}
                </span>
              ))}
              {d.headers.length > 10 && <span className="text-xs text-muted">+{d.headers.length - 10}</span>}
            </div>
          </div>
        ))}
      </div>

      <p className="text-muted text-sm">
        للتقارير المالية بالتاريخ (تحصيل، متبقّي، تدفّق نقدي) استخدم تبويب «الحسابات». التبويب ده بيصدّر
        البيانات الخام الكاملة من كل الجوانب.
      </p>
    </div>
  );
}
