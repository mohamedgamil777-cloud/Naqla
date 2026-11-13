import Link from "next/link";
import { notFound } from "next/navigation";
import { DATASET_META, getDatasets, type DatasetKey } from "@/services/reporting-service";
import { requirePermission } from "@/lib/authz";
import { DownloadButton, ReportTable } from "@/components/ReportTable";
import { Pagination, listHref } from "@/components/Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const PREVIEW_SIZE = 20;

/** One reporting dataset (or all of them) shown on screen, with search, pages and the CSV download. */
export default async function ReportView({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermission("report:read");
  const { key } = await params;
  const isAll = key === "all-data";
  if (!isAll && !(key in DATASET_META)) notFound();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const datasets = await getDatasets();
  const back = (
    <Link href="/admin/reports" className="text-primary font-bold">
      → كل التقارير
    </Link>
  );

  if (isAll) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">كل بيانات الشركة</h1>
            <p className="text-muted text-sm mt-1">أول {PREVIEW_SIZE} صف من كل تقرير. افتح أي تقرير لعرضه كامل.</p>
          </div>
          <DownloadButton href="/api/admin/export?report=all-data" label="تنزيل الكل (Excel)" />
        </div>
        {datasets.map((ds) => (
          <section key={ds.key} className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-extrabold text-lg">
                {ds.title} <span className="text-muted text-sm font-normal">({ds.rows.length} صف)</span>
              </h2>
              <Link href={`/admin/reports/${ds.key}`} className="text-primary font-bold">
                عرض كامل ←
              </Link>
            </div>
            <ReportTable headers={ds.headers} rows={ds.rows.slice(0, PREVIEW_SIZE)} />
          </section>
        ))}
      </div>
    );
  }

  const ds = datasets.find((d) => d.key === (key as DatasetKey))!;
  const needle = q.toLowerCase();
  const rows = needle ? ds.rows.filter((r) => r.some((c) => String(c).toLowerCase().includes(needle))) : ds.rows;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number(sp.page) || 1));
  const start = (page - 1) * PAGE_SIZE;

  return (
    <div className="flex flex-col gap-4">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{ds.title}</h1>
          <p className="text-muted text-sm mt-1">
            {q ? `${rows.length} نتيجة من ${ds.rows.length} صف` : `${ds.rows.length} صف`} · {ds.headers.length} عمود
          </p>
        </div>
        <DownloadButton href={`/api/admin/export?report=${ds.key}`} />
      </div>
      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="دوّر في التقرير (اسم، موبايل، رقم طلب...)"
          className="flex-1 min-w-[14rem] rounded-xl border border-line-2 bg-panel px-3 py-2"
        />
        <button className="rounded-xl px-5 py-2 font-bold bg-ink text-white">بحث</button>
        {q && (
          <Link href={`/admin/reports/${ds.key}`} className="rounded-xl px-4 py-2 font-bold border border-line-2">
            مسح
          </Link>
        )}
      </form>
      <ReportTable
        headers={ds.headers}
        rows={rows.slice(start, start + PAGE_SIZE)}
        empty={q ? "مفيش نتايج للبحث ده." : "مفيش بيانات."}
      />
      <Pagination
        page={page}
        totalPages={totalPages}
        href={(p) => listHref(`/admin/reports/${ds.key}`, { q, page: p })}
      />
    </div>
  );
}
