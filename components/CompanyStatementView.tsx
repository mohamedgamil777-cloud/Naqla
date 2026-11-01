import { formatEgp } from "@/lib/money";
import { labelDateArabic } from "@/lib/time";
import { Logo } from "@/components/Logo";
import { monthLabel, type CompanyStatement } from "@/services/company-service";

const METHOD: Record<string, string> = { cash: "كاش", bank: "تحويل بنكي", wallet: "محفظة" };

/** Printable monthly statement (shared by admin and the company's own page). */
export function CompanyStatementView({ st }: { st: CompanyStatement }) {
  return (
    <article className="bg-panel border border-line rounded-card p-5 md:p-7 flex flex-col gap-5 print:border-0 print:p-0 print:shadow-none">
      <header className="flex items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-extrabold">كشف حساب شهري</h1>
          <div className="text-ink-2 mt-1">
            عن شهر <span className="font-bold">{monthLabel(st.month)}</span>
          </div>
          <div className="mt-3 text-sm leading-relaxed">
            <div className="font-extrabold text-base">{st.company.name}</div>
            {st.company.taxNumber && <div>الرقم الضريبي: <span dir="ltr">{st.company.taxNumber}</span></div>}
            {st.company.address && <div>{st.company.address}</div>}
          </div>
        </div>
        <Logo className="h-12" />
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <Tile label="رصيد أول المدة" value={st.opening} />
        <Tile label="رحلات الشهر" value={st.charges} />
        <Tile label="المدفوع في الشهر" value={-st.paid} />
        <Tile label="المستحق آخر المدة" value={st.closing} strong />
      </section>

      <section>
        <h2 className="font-extrabold mb-2">الرحلات ({st.trips.length})</h2>
        {st.trips.length === 0 ? (
          <p className="text-muted text-sm">مفيش رحلات على الحساب في الشهر ده.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted text-right">
                <tr className="border-b border-line">
                  <th className="py-2 px-2 font-semibold">التاريخ</th>
                  <th className="py-2 px-2 font-semibold">رقم الطلب</th>
                  <th className="py-2 px-2 font-semibold">من ← إلى</th>
                  <th className="py-2 px-2 font-semibold">العربية</th>
                  <th className="py-2 px-2 font-semibold">طلبها</th>
                  <th className="py-2 px-2 font-semibold">استلمها</th>
                  <th className="py-2 px-2 font-semibold text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {st.trips.map((o) => (
                  <tr key={o.code} className="border-b border-line/70 align-top">
                    <td className="py-2 px-2 whitespace-nowrap">{labelDateArabic(o.scheduledAt)}</td>
                    <td className="py-2 px-2" dir="ltr">#{o.code}</td>
                    <td className="py-2 px-2">{o.pickupAddress || "—"} ← {o.dropoffAddress || "—"}</td>
                    <td className="py-2 px-2 whitespace-nowrap">{o.sizeName}</td>
                    <td className="py-2 px-2">{o.contactName ?? "—"}</td>
                    <td className="py-2 px-2">{o.podName ?? "—"}</td>
                    <td className="py-2 px-2 text-left font-bold whitespace-nowrap">{formatEgp(o.priceSnapshot.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-extrabold">
                  <td className="py-2 px-2" colSpan={6}>الإجمالي</td>
                  <td className="py-2 px-2 text-left whitespace-nowrap">{formatEgp(st.charges)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-extrabold mb-2">المدفوعات ({st.payments.length})</h2>
        {st.payments.length === 0 ? (
          <p className="text-muted text-sm">مفيش مدفوعات مسجّلة في الشهر ده.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {st.payments.map((p) => (
                <tr key={p.id} className="border-b border-line/70">
                  <td className="py-2 px-2">{labelDateArabic(p.createdAt)}</td>
                  <td className="py-2 px-2">{METHOD[p.method] ?? p.method}</td>
                  <td className="py-2 px-2 text-muted">{p.note ?? ""}</td>
                  <td className="py-2 px-2 text-left font-bold">{formatEgp(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="text-xs text-muted border-t border-line pt-3">
        الكشف ده بيشمل الرحلات اللي اتسلّمت والمسجّلة على حساب الشركة. أي استفسار؟ كلّمنا من صفحة المساعدة.
      </footer>
    </article>
  );
}

function Tile({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${strong ? "bg-primary text-white" : "bg-panel-2"}`}>
      <div className={`text-xs ${strong ? "text-white/80" : "text-muted"}`}>{label}</div>
      <div className="text-lg font-extrabold mt-0.5" dir="ltr">{formatEgp(value)}</div>
    </div>
  );
}
