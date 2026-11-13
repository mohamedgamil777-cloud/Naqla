import { z } from "zod";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { searchAuditLogs, type AuditListItem } from "@/db/lib/audit";
import { listStaff } from "@/db/lib/staff";
import { requirePermission } from "@/lib/authz";
import {
  AUDIT_GROUPS,
  AUDIT_META_KEYS,
  actionsInGroup,
  auditActionInfo,
  fieldLabel,
  formatAuditValue,
  type AuditGroup,
} from "@/lib/audit-catalog";
import { TZ, cairoDateISO, cairoDateTime, cairoHour, labelDateArabic, nextDateISO } from "@/lib/time";
import { Pagination, listHref } from "@/components/Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;
const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);
const Query = z.object({
  who: z.string().trim().max(60).optional().catch(undefined),
  type: z.enum(Object.keys(AUDIT_GROUPS) as [AuditGroup, ...AuditGroup[]]).optional().catch(undefined),
  from: isoDay,
  to: isoDay,
  q: z.string().trim().max(60).catch(""),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Admin → سجل النشاط: every action staff took in the admin. Owner (super_admin) only. */
export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("audit:read");
  const { who, type, from, to, q, page } = Query.parse(await searchParams);
  const actor = who === "owner" || (who && GUID.test(who)) ? who : undefined;

  const [result, staff] = await Promise.all([
    searchAuditLogs(
      {
        actor,
        actions: type ? actionsInGroup(type) : undefined,
        from: from ? cairoDateTime(from, 0) : undefined,
        to: to ? cairoDateTime(nextDateISO(to), 0) : undefined,
        q: q || undefined,
      },
      page,
      PAGE_SIZE,
    ),
    listStaff(),
  ]);
  const people = staff.filter((s) => s.role !== "driver");
  const href = (p: number) => listHref("/admin/activity", { who: actor, type, from, to, q, page: p });
  const filtered = !!(actor || type || from || to || q);
  const today = cairoDateISO(new Date());

  // group the page by day (Cairo time)
  const days: { day: string; rows: AuditListItem[] }[] = [];
  for (const row of result.rows) {
    const day = cairoDateISO(row.createdAt);
    if (days.at(-1)?.day !== day) days.push({ day, rows: [] });
    days.at(-1)!.rows.push(row);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold">سجل النشاط</h1>
        <p className="text-muted">كل حاجة الموظفين عملوها في لوحة الإدارة: مين عمل إيه، إمتى، وعلى أنهي طلب أو عربية.</p>
      </div>

      <form method="get" action="/admin/activity" className="bg-panel border border-line rounded-card p-4 grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
        <label className="col-span-2 md:col-span-2">
          <span className="block text-xs font-bold text-ink-2 mb-1">الموظف</span>
          <select name="who" defaultValue={actor ?? ""} className="w-full rounded-xl border border-line-2 bg-panel px-3 py-2 text-base lg:text-sm">
            <option value="">الكل</option>
            <option value="owner">المدير (كلمة سر الإدارة)</option>
            {people.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.phone}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 md:col-span-2">
          <span className="block text-xs font-bold text-ink-2 mb-1">نوع العملية</span>
          <select name="type" defaultValue={type ?? ""} className="w-full rounded-xl border border-line-2 bg-panel px-3 py-2 text-base lg:text-sm">
            <option value="">الكل</option>
            {(Object.entries(AUDIT_GROUPS) as [AuditGroup, string][]).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="block text-xs font-bold text-ink-2 mb-1">من يوم</span>
          <input type="date" name="from" defaultValue={from} max={today} className="w-full rounded-xl border border-line-2 bg-panel px-3 py-2 text-base lg:text-sm" />
        </label>
        <label>
          <span className="block text-xs font-bold text-ink-2 mb-1">لحد يوم</span>
          <input type="date" name="to" defaultValue={to} max={today} className="w-full rounded-xl border border-line-2 bg-panel px-3 py-2 text-base lg:text-sm" />
        </label>
        <label className="col-span-2 md:col-span-4">
          <span className="block text-xs font-bold text-ink-2 mb-1">بحث</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="رقم الطلب أو الحجز، اسم عربية، اسم عميل"
            className="w-full rounded-xl border border-line-2 bg-panel px-3 py-2 text-base lg:text-sm"
          />
        </label>
        <div className="col-span-2 flex gap-2">
          <button className="flex-1 rounded-xl px-5 py-2 font-bold bg-ink text-white">عرض</button>
          {filtered && (
            <Link href="/admin/activity" className="rounded-xl px-4 py-2 font-bold border border-line-2 text-center">
              مسح الفلتر
            </Link>
          )}
        </div>
      </form>

      {result.rows.length === 0 ? (
        <div className="bg-panel border border-line rounded-card p-8 text-center text-muted">
          {filtered ? "مفيش حاجة بالفلتر ده." : "لسه مفيش نشاط متسجّل. أي حاجة الموظفين يعملوها من دلوقتي هتظهر هنا."}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">{result.total.toLocaleString("ar-EG")} عملية</p>
          {days.map(({ day, rows }) => (
            <section key={day} className="flex flex-col gap-2">
              <h2 className="font-bold text-ink-2 text-sm">
                {day === today ? "النهارده" : labelDateArabic(cairoDateTime(day, 12))}
              </h2>
              <ul className="bg-panel border border-line rounded-card divide-y divide-line">
                {rows.map((row) => (
                  <ActivityRow key={row.id} row={row} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
      <Pagination page={result.page} totalPages={result.totalPages} href={href} />
    </div>
  );
}

function timeLabel(d: Date): string {
  return `${formatInTimeZone(d, TZ, "h:mm")} ${cairoHour(d) < 12 ? "ص" : "م"}`;
}

function ActivityRow({ row }: { row: AuditListItem }) {
  const info = auditActionInfo(row.action);
  const after = row.after ?? {};
  const label = typeof after._label === "string" ? after._label : null;
  const by = row.actorName || (typeof after._by === "string" ? after._by : null) || "المدير";
  const meta = new Set<string>(AUDIT_META_KEYS);
  const before = row.before ?? {};
  const empty = (v: unknown) => v === null || v === undefined || v === "";
  // a field shown on one side only is skipped when it is empty (e.g. "ملاحظة: —" on a new expense)
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (k) => !meta.has(k) && !((k in before) !== (k in after) && empty(k in before ? before[k] : after[k])),
  );

  return (
    <li className="p-3 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-xs text-muted tabular-nums" dir="ltr">
          {timeLabel(row.createdAt)}
        </span>
        <span className="font-bold">{by}</span>
        <span className={info.danger ? "font-bold text-booked" : "text-ink-2"}>{info.label}</span>
        {label && <span className="font-semibold">«{label}»</span>}
      </div>
      {keys.length > 0 && (
        <ul className="text-sm text-ink-2 flex flex-col gap-0.5 ps-1">
          {keys.map((k) => {
            const hasBefore = k in before;
            const hasAfter = k in after;
            return (
              <li key={k}>
                <span className="text-muted">{fieldLabel(k)}:</span>{" "}
                {hasBefore && hasAfter ? (
                  <>
                    <span className="line-through decoration-muted/60">{formatAuditValue(k, before[k])}</span>
                    {" ← "}
                    <span className="font-semibold text-ink">{formatAuditValue(k, after[k])}</span>
                  </>
                ) : (
                  <span className={hasBefore ? "" : "font-semibold text-ink"}>
                    {formatAuditValue(k, hasBefore ? before[k] : after[k])}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
