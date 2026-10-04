import { getFinance } from "@/services/finance-service";
import { formatEgp } from "@/lib/money";
import { cairoDateISO, labelDateArabic } from "@/lib/time";
import { BookingStatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";
const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const todayISO = cairoDateISO(new Date());
  const monthStart = todayISO.slice(0, 8) + "01";
  const from = isDate(sp.from) ? sp.from! : monthStart;
  const to = isDate(sp.to) ? sp.to! : cairoDateISO(new Date(Date.now() + 30 * 86400000));

  const fin = await getFinance(from, to);
  const s = fin.summary;
  const q = `from=${from}&to=${to}`;

  const presets = [
    { label: "الشهر الحالي", from: monthStart, to: todayISO },
    { label: "آخر 30 يوم", from: cairoDateISO(new Date(Date.now() - 30 * 86400000)), to: todayISO },
    { label: "الشهر الجاي", from: todayISO, to: cairoDateISO(new Date(Date.now() + 30 * 86400000)) },
    { label: "السنة", from: todayISO.slice(0, 4) + "-01-01", to: todayISO.slice(0, 4) + "-12-31" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">الحسابات والتقارير</h1>
          <p className="text-muted text-sm">من {labelDateArabic(new Date(from + "T12:00:00"))} لحد {labelDateArabic(new Date(to + "T12:00:00"))}</p>
        </div>
      </div>

      {/* Date filter */}
      <div className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const active = from === p.from && to === p.to;
            return (
              <a key={p.label} href={`/admin/finance?from=${p.from}&to=${p.to}`}
                className={`px-4 py-2 rounded-xl font-semibold text-sm ${active ? "bg-primary text-white" : "bg-panel-2 text-ink-2"}`}>
                {p.label}
              </a>
            );
          })}
        </div>
        <form method="get" action="/admin/finance" className="flex flex-wrap items-end gap-3">
          <label><span className="block text-xs font-bold text-ink-2 mb-1">من يوم</span>
            <input type="date" name="from" defaultValue={from} className="rounded-xl border border-line-2 bg-panel px-3 py-2" /></label>
          <label><span className="block text-xs font-bold text-ink-2 mb-1">لحد يوم</span>
            <input type="date" name="to" defaultValue={to} className="rounded-xl border border-line-2 bg-panel px-3 py-2" /></label>
          <button className="rounded-xl px-5 py-2 font-bold bg-ink text-white">تطبيق</button>
        </form>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="إجمالي المطلوب" value={formatEgp(s.totalDue)} />
        <Tile label="المحصّل" value={formatEgp(s.totalPaid)} tone="ok" />
        <Tile label="المتبقّي (غير محصّل)" value={formatEgp(s.totalRemaining)} tone="warn" />
        <Tile label="عدد الرحلات" value={String(s.trips)} />
        <Tile label="التأمينات المحتجزة" value={formatEgp(s.depositsHeld)} />
        <Tile label="التأمينات المستردة" value={formatEgp(s.depositsRefunded)} />
        <Tile label="متوسط قيمة الرحلة" value={formatEgp(s.avgTrip)} />
        <div className="rounded-2xl p-4 bg-panel-2">
          <div className="text-xs text-muted">طرق الدفع (المحصّل)</div>
          <div className="text-sm font-bold mt-1">كاش {formatEgp(fin.byMethod.cash)}</div>
          <div className="text-sm font-bold">كارت {formatEgp(fin.byMethod.card)}</div>
          <div className="text-sm font-bold">أونلاين {formatEgp(fin.byMethod.online)}</div>
        </div>
      </div>

      {/* Export */}
      <div className="flex flex-wrap gap-3">
        <ExportBtn href={`/api/admin/export?report=bookings&${q}`} label="⬇️ تقرير الرحلات المفصّل" />
        <ExportBtn href={`/api/admin/export?report=cashflow&${q}`} label="⬇️ تقرير التدفّق النقدي" />
        <ExportBtn href={`/api/admin/export?report=revenue-by-vehicle&${q}`} label="⬇️ الإيراد حسب العربية" />
      </div>

      {/* Detailed per-trip report */}
      <Section title="تقرير الرحلات المفصّل">
        {fin.rows.length === 0 ? (
          <p className="text-muted p-4">مفيش رحلات في الفترة دي.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead>
                <tr className="bg-panel-2">
                  <Th>رقم الرحلة</Th><Th>التاريخ</Th><Th>العربية</Th><Th>العميل</Th><Th>الحالة</Th>
                  <Th>المطلوب</Th><Th>المدفوع</Th><Th>المتبقي</Th><Th>التأمين</Th>
                </tr>
              </thead>
              <tbody>
                {fin.rows.map((r) => (
                  <tr key={r.code} className="border-t border-line">
                    <Td>
                      <a href={`/admin/bookings/${r.code}`} className="font-bold text-primary hover:underline">#{r.code}</a>
                      {r.source === "agent" && <span className="block text-[10px] font-bold text-accent-ink bg-accent-soft rounded-full px-1.5 py-0.5 w-fit mt-0.5">موظف</span>}
                    </Td>
                    <Td>{r.dateLabel}</Td>
                    <Td>{r.vehicle}</Td>
                    <Td><div>{r.customer}</div><div className="text-muted text-xs" dir="ltr">{r.phone}</div></Td>
                    <Td><BookingStatusBadge status={r.status} /></Td>
                    <Td className="font-semibold">{formatEgp(r.total)}</Td>
                    <Td className="font-bold text-ok">{formatEgp(r.paid)}</Td>
                    <Td className={`font-bold ${r.remaining > 0 ? "text-rented" : "text-muted"}`}>{formatEgp(r.remaining)}</Td>
                    <Td>{formatEgp(r.depositHeld)}{r.depositRefunded > 0 && <span className="block text-xs text-muted">مسترد {formatEgp(r.depositRefunded)}</span>}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line-2 bg-panel-2 font-extrabold">
                  <Td>الإجمالي</Td><Td /><Td /><Td /><Td />
                  <Td>{formatEgp(s.totalDue)}</Td><Td className="text-ok">{formatEgp(s.totalPaid)}</Td>
                  <Td className="text-rented">{formatEgp(s.totalRemaining)}</Td><Td>{formatEgp(s.depositsHeld)}</Td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      {/* Cashflow */}
      <Section title="التدفّق النقدي (حسب يوم التحصيل)">
        {fin.cashflow.length === 0 ? (
          <p className="text-muted p-4">مفيش تحصيل في الفترة دي.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead><tr className="bg-panel-2"><Th>التاريخ</Th><Th>تحصيل إيجار</Th><Th>تأمين وارد</Th><Th>تأمين مسترد</Th><Th>صافي النقدية</Th></tr></thead>
              <tbody>
                {fin.cashflow.map((c) => (
                  <tr key={c.dateISO} className="border-t border-line">
                    <Td>{c.dateLabel}</Td><Td className="text-ok font-semibold">{formatEgp(c.rentIn)}</Td>
                    <Td>{formatEgp(c.depositIn)}</Td><Td className="text-booked">{formatEgp(c.depositOut)}</Td>
                    <Td className="font-bold">{formatEgp(c.net)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Revenue by vehicle */}
      <Section title="الإيراد حسب العربية">
        {fin.byVehicle.length === 0 ? (
          <p className="text-muted p-4">لا يوجد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead><tr className="bg-panel-2"><Th>العربية</Th><Th>عدد الرحلات</Th><Th>المحصّل</Th></tr></thead>
              <tbody>
                {fin.byVehicle.map((v) => (
                  <tr key={v.name} className="border-t border-line"><Td>{v.name}</Td><Td>{v.trips}</Td><Td className="font-bold text-ok">{formatEgp(v.collected)}</Td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <p className="text-muted text-sm">
        ملاحظة: التقارير دي بتغطي الإيرادات والتحصيل والتأمينات. لعمل قائمة أرباح وخسائر (P&amp;L) كاملة محتاجين نضيف تسجيل المصروفات (صيانة، وقود، رواتب) — أقدر أضيفها كخطوة جاية.
      </p>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  const color = tone === "ok" ? "text-ok" : tone === "warn" ? "text-rented" : "text-ink";
  return (
    <div className="rounded-2xl p-4 bg-panel border border-line">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-2xl font-extrabold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
function ExportBtn({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="rounded-2xl px-5 py-3 font-bold bg-primary text-white">
      {label}
    </a>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-panel border border-line rounded-card p-5">
      <h2 className="font-extrabold text-lg mb-3">{title}</h2>
      {children}
    </div>
  );
}
function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-start font-bold p-3 whitespace-nowrap">{children}</th>;
}
function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`p-3 align-top ${className}`}>{children}</td>;
}
