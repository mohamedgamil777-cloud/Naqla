import Link from "next/link";
import { z } from "zod";
import { searchBookings } from "@/db/lib/bookings";
import { Pagination, listHref } from "@/components/Pagination";
import { formatEgp } from "@/lib/money";
import { labelDateArabic, labelTime, cairoDateISO, cairoDateTime, nextDateISO } from "@/lib/time";
import { durationLabel } from "@/lib/client-time";
import { BookingStatusBadge } from "@/components/ui";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Query = z.object({
  from: isoDate.optional().catch(undefined),
  to: isoDate.optional().catch(undefined),
  q: z.string().trim().max(60).catch(""),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export default async function AdminBookings({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("booking:read");
  const sp = Query.parse(await searchParams);
  const todayISO = cairoDateISO(new Date());
  const in30 = cairoDateISO(new Date(Date.now() + 30 * 86400000));
  const from = sp.from ?? todayISO;
  const to = sp.to ?? in30;

  // filtered, sorted and paginated in the database (pickup day in [from, to], Cairo time)
  const result = await searchBookings(
    { q: sp.q, start: cairoDateTime(from, 0), end: cairoDateTime(nextDateISO(to), 0) },
    sp.page,
    PAGE_SIZE,
  );
  const list = result.rows;
  const href = (page: number) => listHref("/admin/bookings", { from, to, q: sp.q, page });

  const presets: { label: string; from: string; to: string }[] = [
    { label: "النهاردة", from: todayISO, to: todayISO },
    { label: "الأسبوع", from: todayISO, to: cairoDateISO(new Date(Date.now() + 7 * 86400000)) },
    { label: "الشهر", from: todayISO, to: in30 },
    { label: "الكل", from: "2000-01-01", to: "2100-01-01" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">الحجوزات</h1>
        <Link
          href="/admin/new-booking"
          className="rounded-2xl px-5 py-2.5 font-bold bg-primary text-white flex items-center gap-2"
        >
          <span className="text-xl leading-none">+</span> حجز جديد
        </Link>
      </div>

      {/* Date filter */}
      <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const active = from === p.from && to === p.to;
            return (
              <Link
                key={p.label}
                href={`/admin/bookings?from=${p.from}&to=${p.to}`}
                className={`px-4 py-2 rounded-xl font-semibold text-sm ${active ? "bg-primary text-white" : "bg-panel-2 text-ink-2"}`}
              >
                {p.label}
              </Link>
            );
          })}
        </div>
        <form method="get" action="/admin/bookings" className="flex flex-wrap items-end gap-3">
          <label>
            <span className="block text-xs font-bold text-ink-2 mb-1">من يوم</span>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="rounded-xl border border-line-2 bg-panel px-3 py-2"
            />
          </label>
          <label>
            <span className="block text-xs font-bold text-ink-2 mb-1">لحد يوم</span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="rounded-xl border border-line-2 bg-panel px-3 py-2"
            />
          </label>
          <label>
            <span className="block text-xs font-bold text-ink-2 mb-1">بحث</span>
            <input
              type="search"
              name="q"
              defaultValue={sp.q}
              placeholder="رقم، اسم، موبايل، عربية"
              className="rounded-xl border border-line-2 bg-panel px-3 py-2 text-base lg:text-sm"
            />
          </label>
          <button className="rounded-xl px-5 py-2 font-bold bg-ink text-white">تصفية</button>
        </form>
        <p className="text-muted text-sm">
          {result.total} حجز من {labelDateArabic(new Date(from + "T12:00:00"))} لحد{" "}
          {labelDateArabic(new Date(to + "T12:00:00"))}.
        </p>
      </div>

      {list.length === 0 ? (
        <p className="text-muted">
          {sp.q ? "مفيش حجوزات بالبحث ده في الفترة دي." : "مفيش حجوزات في الفترة دي."}
        </p>
      ) : (
        <div className="overflow-x-auto border border-line rounded-card bg-panel">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-panel-2 text-start">
                <Th>رقم</Th>
                <Th>العربية</Th>
                <Th>العميل</Th>
                <Th>الميعاد</Th>
                <Th>المدة</Th>
                <Th>الإجمالي</Th>
                <Th>الحالة</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.code} className="border-t border-line">
                  <Td>
                    <Link
                      href={`/admin/bookings/${b.code}`}
                      className="font-bold text-primary hover:underline"
                    >
                      #{b.code}
                    </Link>
                    {b.source === "agent" && (
                      <span className="block mt-1 text-[11px] font-bold text-accent-ink bg-accent-soft rounded-full px-2 py-0.5 w-fit">
                        بواسطة الموظف{b.agentName ? `: ${b.agentName}` : ""}
                      </span>
                    )}
                  </Td>
                  <Td>{b.vehicleName}</Td>
                  <Td>
                    <div>{b.contactName ?? "-"}</div>
                    <div className="text-muted text-xs" dir="ltr">
                      {b.contactPhone}
                    </div>
                  </Td>
                  <Td>
                    {labelDateArabic(b.startsAt)}
                    <div className="text-muted text-xs">
                      {labelTime(b.startsAt)} → {labelTime(b.endsAt)}
                    </div>
                  </Td>
                  <Td>{durationLabel(b.hours)}</Td>
                  <Td className="font-bold text-emph">{formatEgp(b.priceSnapshot.total)}</Td>
                  <Td>
                    <BookingStatusBadge status={b.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={result.page} totalPages={result.totalPages} href={href} />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-start font-bold p-3 whitespace-nowrap">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`p-3 align-top ${className}`}>{children}</td>;
}
