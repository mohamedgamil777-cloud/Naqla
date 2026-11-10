import Link from "next/link";
import { companyBalances, countCompanyMembers, listCompanies } from "@/db/lib/companies";
import { formatEgp } from "@/lib/money";
import { listCompanyRequests } from "@/db/lib/company-requests";
import { setCompanyRequestStatusAction } from "@/actions/admin/companies";
import { toLocal } from "@/lib/phone";
import { labelDateArabic } from "@/lib/time";
import { CompanyForm } from "@/components/admin/CompanyForms";
import { requirePermission } from "@/lib/authz";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function AdminCompanies() {
  await requirePermission("company:manage");
  // member counts and balances are grouped in the database (two queries, not two per company)
  const [companies, memberCounts, balances, requests] = await Promise.all([
    listCompanies(),
    countCompanyMembers(),
    companyBalances(),
    listCompanyRequests(10),
  ]);
  const rows = companies.map((c) => ({
    c,
    members: memberCounts.get(c.id) ?? 0,
    bal: balances.get(c.id) ?? { charged: 0, paid: 0, outstanding: 0, open: 0 },
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold">الشركات (B2B)</h1>
        <p className="text-muted">حسابات الشركات: مستخدمين متعددين، سعر خاص، ودفع على الحساب بكشف شهري.</p>
      </div>

      <section className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-extrabold">
            طلبات حساب شركة من الموقع
            {requests.open.length > 0 && (
              <span className="ms-2 rounded-full bg-booked text-white px-2 py-0.5 text-xs align-middle">
                {requests.open.length} جديد
              </span>
            )}
          </h2>
          <p className="text-sm text-muted">
            من صفحة «للشركات». كلّم المسؤول، وارفع الشروط للمالك، وبعدين افتح الحساب من «شركة جديدة» تحت.
          </p>
        </div>
        {requests.open.length === 0 && requests.handled.length === 0 ? (
          <p className="text-sm text-muted">مفيش طلبات لسه.</p>
        ) : (
          <div className="flex flex-col divide-y divide-line">
            {[...requests.open, ...requests.handled].map((r) => (
              <div key={r.id} className={`py-2.5 flex flex-wrap items-start justify-between gap-2 ${r.status === "handled" ? "opacity-60" : ""}`}>
                <div className="min-w-0">
                  <div className="font-bold">
                    {r.companyName} · {r.contactName}
                  </div>
                  <div className="text-sm text-muted">
                    <a href={`tel:${r.phone}`} dir="ltr" className="text-primary font-bold">
                      {toLocal(r.phone) ?? r.phone}
                    </a>
                    {r.monthlyTrips ? ` · ${r.monthlyTrips} مشوار في الشهر` : ""} · {labelDateArabic(r.createdAt)}
                  </div>
                  {r.note && <div className="text-sm text-ink-2 mt-0.5 break-words">{r.note}</div>}
                </div>
                <form action={setCompanyRequestStatusAction}>
                  <input type="hidden" name="status" value={r.status === "new" ? "handled" : "new"} />
                  <button name="id" value={r.id} className="text-sm font-bold text-primary">
                    {r.status === "new" ? "تم التواصل ✓" : "رجّعه جديد"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      {rows.length === 0 ? (
        <div className="bg-panel border border-line rounded-card p-6 text-center text-muted">
          لسه مفيش شركات — ضيف أول شركة تحت.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map(({ c, members, bal }) => (
            <Link
              key={c.id}
              href={`/admin/companies/${c.id}`}
              className="bg-panel border border-line rounded-card p-4 flex flex-col gap-2 hover:border-primary"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-lg"><Icon name="building" className="w-4 h-4 inline-block align-[-3px] me-1.5" />{c.name}</span>
                {!c.active && (
                  <span className="rounded-full bg-off-soft text-off px-2.5 py-0.5 text-xs font-bold">
                    موقوف
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-primary-soft text-primary-ink px-2.5 py-0.5">
                  {c.billing === "monthly" ? "على الحساب" : "كاش"}
                </span>
                {c.discountPct > 0 && (
                  <span className="rounded-full bg-accent-soft text-accent-ink px-2.5 py-0.5">
                    خصم {c.discountPct}%
                  </span>
                )}
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
