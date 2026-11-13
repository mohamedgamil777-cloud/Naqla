import { removeCompanyUser, setCompanyUserLoginAction } from "@/actions/customer/company";
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
import { CompanyUserForm, CompanyUserLoginForm } from "@/components/CompanyUserForm";
import { usernamesFor } from "@/db/lib/accounts";
import { AddressBook } from "@/components/AddressBook";
import { defaultBranch } from "@/db/lib/branches";
import { googleMapsConfig } from "@/lib/env";

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
        subtitle="لو شركتك عايزة حساب بسعر تعاقدي ودفع آخر الشهر، قدّم طلب وهنكلمك."
        action={<LinkButton href="/business">اطلب حساب شركة</LinkButton>}
      />
    );
  }
  const { company, member } = ctx;
  const isOwner = member.role === "owner";
  const month = currentMonth();
  const { start, end } = monthRange(month);
  // this month's orders are paginated; the statement months come from the database
  const [monthPage, orderMonths, members, saved, bal, branch] = await Promise.all([
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
    defaultBranch(),
  ]);
  const monthOrders = monthPage.rows;
  const logins = await usernamesFor(members.map((m) => m.phone));
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

      <Section
        title="التقرير الشهري"
        hint={
          isOwner
            ? "لكل شهر: كشف الحساب والفاتورة (اطبعه أو احفظه PDF)، وكل تفاصيل الرحلات في ملف Excel."
            : "لكل شهر: كشف الحساب والفاتورة. ملف Excel بتفاصيل الرحلات مع مدير الحساب."
        }
      >
        <div className="flex flex-col divide-y divide-line">
          {months.map((m) => (
            <div key={m} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">{monthLabel(m)}</span>
              <span className="flex flex-wrap gap-2">
                <Link
                  href={`/company/statement?month=${m}`}
                  className="rounded-xl border-2 border-primary text-primary px-3.5 py-1.5 font-bold text-sm hover:bg-primary-soft"
                >
                  <Icon name="file" className="w-4 h-4 inline-block align-[-3px] me-1.5" />
                  كشف الحساب
                </Link>
                {isOwner && (
                  <a
                    href={`/company/report?month=${m}`}
                    className="rounded-xl border-2 border-line-2 text-ink-2 px-3.5 py-1.5 font-bold text-sm hover:border-primary hover:text-primary"
                  >
                    <Icon name="download" className="w-4 h-4 inline-block align-[-3px] me-1.5" />
                    تفاصيل الرحلات (Excel)
                  </a>
                )}
              </span>
            </div>
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
        hint={
          isOwner
            ? "بتظهر لكل موظفي الشركة في صفحة الطلب. العنوان الأساسي (المخزن مثلاً) بيتملي لوحده كمكان الاستلام. انت بس كمدير للحساب اللي تقدر تضيف وتعدّل."
            : "عناوين الشركة اللي ضافها مدير الحساب. بتختارها بضغطة وانت بتطلب. لو محتاج عنوان جديد، اطلبه من مدير الحساب."
        }
      >
        <AddressBook
          addresses={saved.map((a) => ({
            id: a.id,
            label: a.label,
            address: a.address,
            details: a.details,
            lat: a.lat,
            lng: a.lng,
            isDefault: a.isDefault,
          }))}
          apiKey={googleMapsConfig()?.apiKey ?? null}
          near={{ lat: branch.lat ?? 30.0444, lng: branch.lng ?? 31.2357 }}
          labelIdeas={["المخزن", "المصنع", "الفرع الرئيسي", "المكتب"]}
          emptyText={
            isOwner
              ? "مفيش عناوين محفوظة لسه. ضيف عنوان المخزن والفروع عشان الموظفين مايكتبوهاش كل مرة."
              : "مدير الحساب لسه ماضافش عناوين."
          }
          readOnly={!isOwner}
        />
      </Section>

      <Section
        title={`مستخدمين الحساب (${members.length})`}
        hint={
          isOwner
            ? "انت مدير الحساب: بتضيف الموظفين وبتعمل لكل واحد اسم مستخدم وكلمة سر، وبتدير عناوين الشركة."
            : "مدير الحساب هو اللي بيضيف المستخدمين والعناوين."
        }
      >
        <div className="flex flex-col divide-y divide-line">
          {members.map((m) => (
            <div key={m.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold">{m.name ?? "—"}</span>{" "}
                <span className="text-muted text-sm" dir="ltr">
                  {toLocal(m.phone) ?? m.phone}
                </span>{" "}
                {m.role === "owner" && (
                  <span className="rounded-full bg-primary-soft text-primary-ink px-2 py-0.5 text-xs font-bold">
                    مدير الحساب
                  </span>
                )}
                {logins.get(m.phone) && (
                  <span className="block text-sm text-ink-2">
                    اسم المستخدم: <span dir="ltr" className="font-bold">{logins.get(m.phone)}</span>
                  </span>
                )}
              </div>
              {isOwner && (
                <div className="flex items-center gap-3">
                  {m.id !== member.id && (
                    <form action={removeCompanyUser}>
                      <button name="id" value={m.id} className="text-booked text-sm font-bold">
                        حذف
                      </button>
                    </form>
                  )}
                </div>
              )}
              {isOwner && (
                <CompanyUserLoginForm
                  action={setCompanyUserLoginAction}
                  memberId={m.id}
                  username={logins.get(m.phone) ?? null}
                />
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
