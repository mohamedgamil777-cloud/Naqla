import { removeCompanyUser, deleteSavedAddressAction } from "@/actions/customer/company";
import Link from "next/link";
import { z } from "zod";
import { Pagination } from "@/components/Pagination";
import { listSavedAddresses } from "@/db/lib/addresses";
import { listCompanyMembers } from "@/db/lib/companies";
import { deliveryOrderMonths, searchDeliveryOrders } from "@/db/lib/delivery-orders";
import { getSession } from "@/services/session";
import {
  addressOwner,
  companyBalance,
  companyContext,
  currentMonth,
  monthLabel,
  monthRange,
} from "@/services/company-service";
import { formatEgp } from "@/lib/money";
import { labelDateArabic, labelTime } from "@/lib/time";
import { toLocal } from "@/lib/phone";
import { EmptyState, LinkButton } from "@/components/ui";
import { Icon } from "@/components/Icons";
import { PodView } from "@/components/PodView";
import { CompanyUserForm } from "@/components/CompanyUserForm";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "استلمنا الطلب", cls: "bg-reserved-soft text-reserved" },
  confirmed: { label: "تم التأكيد", cls: "bg-primary-soft text-primary-ink" },
  assigned: { label: "تم تعيين سائق", cls: "bg-primary-soft text-primary-ink" },
  en_route: { label: "في الطريق", cls: "bg-rented-soft text-rented" },
  arrived: { label: "السائق وصل", cls: "bg-rented-soft text-rented" },
  completed: { label: "تم التوصيل", cls: "bg-ok-soft text-ok" },
  cancelled: { label: "ملغي", cls: "bg-booked-soft text-booked" },
};

const PAGE_SIZE = 20;
const Query = z.object({ page: z.coerce.number().int().min(1).max(10_000).catch(1) });

export default async function CompanyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { page } = Query.parse(await searchParams);
  const session = await getSession();
  if (!session) {
    return (
      <EmptyState
        title="حساب الشركة"
        subtitle="سجّل دخولك برقم موبايلك المسجّل في الشركة"
        action={<LinkButton href="/login?next=/company">دخول</LinkButton>}
      />
    );
  }
  const ctx = await companyContext(session.phone);
  if (!ctx) {
    return (
      <EmptyState
        title="رقمك مش مربوط بحساب شركة"
        subtitle="لو شركتك عايزة حساب بأسعار خاصة ودفع شهري، كلّمنا من صفحة المساعدة."
        action={<LinkButton href="/help">تواصل معانا</LinkButton>}
      />
    );
  }
  const { company, member } = ctx;
  const isOwner = member.role === "owner";
  const month = currentMonth();
  const { start, end } = monthRange(month);
  // this month's orders are paginated; the statement months come from the database
  const [monthPage, orderMonths, members, saved, bal] = await Promise.all([
    searchDeliveryOrders(
      { companyId: company.id, scheduledFrom: start, scheduledTo: end },
      page,
      PAGE_SIZE,
      "recent",
    ),
    deliveryOrderMonths({ companyId: company.id }, 6),
    listCompanyMembers(company.id),
    listSavedAddresses(addressOwner(session.phone, ctx)),
    companyBalance(company.id),
  ]);
  const monthOrders = monthPage.rows;
  const months = [...new Set([month, ...orderMonths])].sort().reverse().slice(0, 6);

  return (
    <div className="p-4 flex flex-col gap-5 w-full max-w-4xl mx-auto">
      <header className="flex items-center gap-3">
        <span className="w-14 h-14 rounded-2xl bg-primary-soft grid place-items-center text-2xl" aria-hidden>
         <Icon name="building" className="w-4 h-4 inline-block align-[-3px] me-1.5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold truncate">{company.name}</h1>
          <p className="text-muted text-sm">
            {isOwner ? "مدير الحساب" : "مستخدم"} ·{" "}
            {company.discountPct > 0 ? `سعر خاص (خصم ${company.discountPct}%)` : "سعر الشركة"} ·{" "}
            {company.billing === "monthly" ? "دفع شهري" : "كاش"}
          </p>
        </div>
      </header>

      {company.billing === "monthly" && (
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-card bg-primary text-white p-4">
            <div className="text-xs text-white/80">المستحق على الحساب</div>
            <div className="text-2xl font-extrabold mt-1">{formatEgp(bal.outstanding)}</div>
          </div>
          <div className="rounded-card bg-panel border border-line p-4">
            <div className="text-xs text-muted">طلبات لسه ماخلصتش</div>
            <div className="text-2xl font-extrabold mt-1 text-emph">{formatEgp(bal.open)}</div>
            {company.creditLimit > 0 && (
              <div className="text-xs text-muted mt-1">حد الائتمان {formatEgp(company.creditLimit)}</div>
            )}
          </div>
        </section>
      )}

      <Link
        href="/estimate"
        className="tap bg-accent text-on-accent rounded-2xl font-extrabold text-lg flex items-center justify-center gap-2"
      >
        اطلب توصيلة باسم الشركة <Icon name="chevronLeft" className="w-5 h-5" strokeWidth={2.6} />
      </Link>

      <Section title="كشف الحساب" hint="اطبعه أو احفظه PDF">
        <div className="flex flex-wrap gap-2">
          {months.map((m) => (
            <Link
              key={m}
              href={`/company/statement?month=${m}`}
              className="rounded-xl border-2 border-primary text-primary px-3.5 py-2 font-bold text-sm hover:bg-primary-soft"
            >
              <Icon name="file" className="w-4 h-4 inline-block align-[-3px] me-1.5" />{monthLabel(m)}
            </Link>
          ))}
        </div>
      </Section>

      <Section title={`طلبات الشهر (${monthPage.total})`} hint="كل طلبات موظفي الشركة">
        {monthOrders.length === 0 ? (
          <p className="text-muted text-sm">لسه مفيش طلبات الشهر ده.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {monthOrders.map((o) => (
              <div key={o.code} className="border border-line rounded-2xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">
                    <span dir="ltr">#{o.code}</span> · {o.sizeName}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS[o.status]?.cls ?? ""}`}
                  >
                    {STATUS[o.status]?.label ?? o.status}
                  </span>
                </div>
                <div className="text-sm text-ink-2 truncate">
                  {o.pickupAddress || "—"} ← {o.dropoffAddress || "—"}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">
                    {labelDateArabic(o.scheduledAt)} {labelTime(o.scheduledAt)} · طلبها {o.contactName ?? "—"}
                  </span>
                  <span className="font-extrabold text-emph">{formatEgp(o.priceSnapshot.total)}</span>
                </div>
                {o.status === "completed" && <PodView o={o} />}
              </div>
            ))}
          </div>
        )}
        <Pagination
          page={monthPage.page}
          totalPages={monthPage.totalPages}
          href={(p) => `/company?page=${p}`}
        />
      </Section>

      <Section
        title={`العناوين المحفوظة (${saved.length})`}
        hint="بتظهر لكل موظفي الشركة في صفحة الطلب — احفظ عنوان جديد بزرار «⭐ احفظ» وانت بتطلب"
      >
        {saved.length === 0 ? (
          <p className="text-muted text-sm">مفيش عناوين محفوظة لسه.</p>
        ) : (
          <div className="flex flex-col divide-y divide-line">
            {saved.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold"><Icon name="mapPin" className="w-4 h-4 inline-block align-[-3px] me-1.5" />{a.label}</div>
                  <div className="text-sm text-muted truncate">
                    {a.address}
                    {a.details ? ` — ${a.details}` : ""}
                  </div>
                </div>
                <form action={deleteSavedAddressAction}>
                  <button name="id" value={a.id} className="text-booked text-sm font-bold">
                    حذف
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={`مستخدمين الحساب (${members.length})`}>
        <div className="flex flex-col divide-y divide-line">
          {members.map((m) => (
            <div key={m.id} className="py-2.5 flex items-center justify-between gap-2">
              <div>
                <span className="font-bold">{m.name ?? "—"}</span>{" "}
                <span className="text-muted text-sm" dir="ltr">
                  {toLocal(m.phone) ?? m.phone}
                </span>{" "}
                {m.role === "owner" && (
                  <span className="rounded-full bg-primary-soft text-primary-ink px-2 py-0.5 text-xs font-bold">
                    مدير
                  </span>
                )}
              </div>
              {isOwner && m.id !== member.id && (
                <form action={removeCompanyUser}>
                  <button name="id" value={m.id} className="text-booked text-sm font-bold">
                    حذف
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
        {isOwner && <CompanyUserForm />}
      </Section>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-extrabold">{title}</h2>
        {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
