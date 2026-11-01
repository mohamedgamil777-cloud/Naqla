import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/data/repo";
import { requireAdminRole } from "@/services/admin-auth";
import { companyBalance, currentMonth, monthLabel } from "@/services/company-service";
import { formatEgp } from "@/lib/money";
import { labelDateArabic, labelTime } from "@/lib/time";
import { toLocal } from "@/lib/phone";
import { CompanyForm, MemberForm, PaymentForm } from "@/components/admin/CompanyForms";
import { removeMemberAction, deleteCompanyPaymentAction } from "@/app/admin/companies/actions";

export const dynamic = "force-dynamic";

const METHOD: Record<string, string> = { cash: "كاش", bank: "تحويل بنكي", wallet: "محفظة" };
const STATUS: Record<string, string> = {
  new: "جديد", confirmed: "مؤكد", assigned: "تم تعيين سائق", en_route: "في الطريق", arrived: "وصل للاستلام", completed: "تم التوصيل", cancelled: "ملغي",
};

export default async function AdminCompany({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminRole(["super_admin", "finance"]);
  const { id } = await params;
  const company = await repo.getCompany(id);
  if (!company) notFound();
  const [members, payments, orders, bal] = await Promise.all([
    repo.listCompanyMembers(id),
    repo.listCompanyPayments(id),
    repo.listDeliveryOrdersByCompany(id),
    companyBalance(id),
  ]);
  // months that have activity (+ the current one) for the statement picker
  const months = [...new Set([currentMonth(), ...orders.map((o) => o.scheduledAt.toISOString().slice(0, 7))])].sort().reverse();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/companies" className="text-primary font-bold">الشركات</Link>
        <span className="text-muted">/</span>
        <span className="font-bold">{company.name}</span>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="إجمالي الرحلات على الحساب" value={formatEgp(bal.charged)} />
        <Tile label="المدفوع" value={formatEgp(bal.paid)} />
        <Tile label="المستحق" value={formatEgp(bal.outstanding)} strong />
        <Tile
          label="طلبات مفتوحة / حد الائتمان"
          value={`${formatEgp(bal.open)} / ${company.creditLimit ? formatEgp(company.creditLimit) : "مفتوح"}`}
        />
      </section>

      <Card title="بيانات الشركة والتسعير">
        <CompanyForm c={company} />
      </Card>

      <Card title={`المستخدمين (${members.length})`} hint="أي حد من دول يدخل برقم موبايله هيطلب باسم الشركة وبسعرها.">
        <div className="flex flex-col divide-y divide-line">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 py-2.5">
              <div>
                <span className="font-bold">{m.name ?? "—"}</span>{" "}
                <span className="text-muted" dir="ltr">{toLocal(m.phone) ?? m.phone}</span>{" "}
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${m.role === "owner" ? "bg-primary-soft text-primary-ink" : "bg-panel-2 text-ink-2"}`}>
                  {m.role === "owner" ? "مدير الحساب" : "مستخدم"}
                </span>
              </div>
              <form action={removeMemberAction}>
                <input type="hidden" name="companyId" value={company.id} />
                <button name="id" value={m.id} className="text-booked text-sm font-bold">حذف</button>
              </form>
            </div>
          ))}
          {members.length === 0 && <p className="text-muted text-sm py-2">لسه مفيش مستخدمين.</p>}
        </div>
        <MemberForm companyId={company.id} />
      </Card>

      <Card title="كشف الحساب الشهري">
        <div className="flex flex-wrap gap-2">
          {months.map((m) => (
            <Link key={m} href={`/admin/companies/${company.id}/statement?month=${m}`} className="rounded-xl border-2 border-primary text-primary px-4 py-2 font-bold hover:bg-primary-soft">
              📄 {monthLabel(m)}
            </Link>
          ))}
        </div>
      </Card>

      <Card title="المدفوعات">
        <PaymentForm companyId={company.id} />
        <div className="flex flex-col divide-y divide-line">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <span>
                <span className="font-extrabold">{formatEgp(p.amount)}</span> · {METHOD[p.method] ?? p.method} · {labelDateArabic(p.createdAt)}
                {p.note && <span className="text-muted"> · {p.note}</span>}
              </span>
              <form action={deleteCompanyPaymentAction}>
                <input type="hidden" name="companyId" value={company.id} />
                <button name="id" value={p.id} className="text-booked font-bold">حذف</button>
              </form>
            </div>
          ))}
          {payments.length === 0 && <p className="text-muted text-sm py-2">مفيش مدفوعات مسجّلة.</p>}
        </div>
      </Card>

      <Card title={`آخر الطلبات (${orders.length})`}>
        <div className="flex flex-col divide-y divide-line text-sm">
          {orders.slice(0, 20).map((o) => (
            <div key={o.code} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
              <span>
                <span className="font-bold" dir="ltr">#{o.code}</span> · {labelDateArabic(o.scheduledAt)} {labelTime(o.scheduledAt)} · {o.sizeName} ·{" "}
                <span className="text-muted">{o.contactName ?? "—"}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs rounded-full bg-panel-2 px-2 py-0.5">{o.billing === "account" ? "على الحساب" : "كاش"}</span>
                <span className="text-xs rounded-full bg-panel-2 px-2 py-0.5">{STATUS[o.status] ?? o.status}</span>
                <span className="font-extrabold">{formatEgp(o.priceSnapshot.total)}</span>
              </span>
            </div>
          ))}
          {orders.length === 0 && <p className="text-muted py-2">لسه مفيش طلبات.</p>}
        </div>
      </Card>
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-panel border border-line rounded-card p-4 md:p-5 flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-extrabold">{title}</h2>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
function Tile({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-card p-4 ${strong ? "bg-primary text-white" : "bg-panel border border-line"}`}>
      <div className={`text-xs ${strong ? "text-white/80" : "text-muted"}`}>{label}</div>
      <div className="text-xl font-extrabold mt-1">{value}</div>
    </div>
  );
}
