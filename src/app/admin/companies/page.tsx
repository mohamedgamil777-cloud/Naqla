import Link from "next/link";
import { repo } from "@/data/repo";
import { requireAdminRole } from "@/services/admin-auth";
import { companyBalance } from "@/services/company-service";
import { formatEgp } from "@/lib/money";
import { CompanyForm } from "@/components/admin/CompanyForms";

export const dynamic = "force-dynamic";

export default async function AdminCompanies() {
  await requireAdminRole(["super_admin", "finance"]);
  const companies = await repo.listCompanies();
  const rows = await Promise.all(
    companies.map(async (c) => ({ c, members: (await repo.listCompanyMembers(c.id)).length, bal: await companyBalance(c.id) }))
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold">الشركات (B2B)</h1>
        <p className="text-muted">حسابات الشركات: مستخدمين متعددين، سعر خاص، ودفع على الحساب بكشف شهري.</p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-panel border border-line rounded-card p-6 text-center text-muted">لسه مفيش شركات — ضيف أول شركة تحت.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map(({ c, members, bal }) => (
            <Link key={c.id} href={`/admin/companies/${c.id}`} className="bg-panel border border-line rounded-card p-4 flex flex-col gap-2 hover:border-primary">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-lg">🏢 {c.name}</span>
                {!c.active && <span className="rounded-full bg-off-soft text-off px-2.5 py-0.5 text-xs font-bold">موقوف</span>}
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-primary-soft text-primary-ink px-2.5 py-0.5">{c.billing === "monthly" ? "على الحساب" : "كاش"}</span>
                {c.discountPct > 0 && <span className="rounded-full bg-accent-soft text-accent-ink px-2.5 py-0.5">خصم {c.discountPct}%</span>}
                <span className="rounded-full bg-panel-2 text-ink-2 px-2.5 py-0.5">{members} مستخدم</span>
              </div>
              {c.billing === "monthly" && (
                <div className="text-sm">
                  المستحق: <span className="font-extrabold text-emph">{formatEgp(bal.outstanding)}</span>
                  {bal.open > 0 && <span className="text-muted"> · طلبات مفتوحة {formatEgp(bal.open)}</span>}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <section className="bg-panel border border-line rounded-card p-4 md:p-5 flex flex-col gap-3">
        <h2 className="text-lg font-extrabold">+ شركة جديدة</h2>
        <CompanyForm />
      </section>
    </div>
  );
}
