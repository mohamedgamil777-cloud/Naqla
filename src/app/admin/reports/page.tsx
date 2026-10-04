import { getDatasets } from "@/services/reporting-service";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const datasets = await getDatasets();
  const totalRows = datasets.reduce((s, d) => s + d.rows.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">تقارير الشركة وتصدير البيانات</h1>
        <p className="text-muted text-sm mt-1">تصدير كل بيانات الشركة لفريق التقارير — كل ملف CSV يفتح في Excel مباشرة.</p>
      </div>

      {/* Export everything */}
      <div className="bg-primary text-white rounded-card p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-extrabold text-lg">تصدير كل بيانات الشركة</div>
          <div className="text-white/80 text-sm">{datasets.length} مجموعات بيانات · {totalRows} صف — ملف واحد شامل.</div>
        </div>
        <a href="/api/admin/export?report=all-data" target="_blank" rel="noopener noreferrer"
          className="rounded-2xl px-6 py-3 font-bold bg-white text-primary">
          ⬇️ تصدير الكل (ملف واحد)
        </a>
      </div>

      {/* Per-dataset */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {datasets.map((d) => (
          <div key={d.key} className="bg-panel border border-line rounded-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-extrabold text-lg">{d.title}</div>
                <div className="text-muted text-sm">{d.rows.length} صف · {d.headers.length} عمود</div>
              </div>
              <a href={`/api/admin/export?report=${d.key}`} target="_blank" rel="noopener noreferrer"
                className="rounded-xl px-4 py-2.5 font-bold bg-primary text-white whitespace-nowrap">
                ⬇️ تصدير
              </a>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {d.headers.slice(0, 10).map((h) => (
                <span key={h} className="text-xs bg-panel-2 text-ink-2 rounded-full px-2 py-0.5">{h}</span>
              ))}
              {d.headers.length > 10 && <span className="text-xs text-muted">+{d.headers.length - 10}</span>}
            </div>
          </div>
        ))}
      </div>

      <p className="text-muted text-sm">
        للتقارير المالية بالتاريخ (تحصيل، متبقّي، تدفّق نقدي) استخدم تبويب «الحسابات». التبويب ده بيصدّر البيانات الخام الكاملة من كل الجوانب.
      </p>
    </div>
  );
}
