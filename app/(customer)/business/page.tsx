import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/services/session";
import { companyContext } from "@/services/company-service";
import { getAppContent } from "@/db/lib/settings";
import { phoneLabel, telHref, waDigits } from "@/lib/content";
import { toLocal } from "@/lib/phone";
import { Icon, type IconName } from "@/components/Icons";
import { CompanyRequestForm } from "@/components/CompanyRequestForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "انقلي للشركات" };

/** What each kind of account gets — one row per difference. */
const COMPARE: { topic: string; person: string; company: string }[] = [
  { topic: "مين بيطلب", person: "انت بس، برقم موبايلك", company: "كل موظف برقمه، والطلبات كلها باسم الشركة" },
  { topic: "السعر", person: "سعر الموقع، وتقدر تستخدم كوبون خصم", company: "سعر تعاقدي ثابت متفق عليه (من غير كوبونات)" },
  { topic: "الدفع", person: "كاش للسواق بعد التوصيل", company: "كاش، أو على الحساب وتدفع آخر الشهر" },
  { topic: "الفواتير", person: "—", company: "كشف حساب شهري تقدر تطبعه PDF" },
  { topic: "العناوين المحفوظة", person: "عناوينك انت", company: "عناوين مشتركة لكل الموظفين (المخزن، الفروع)" },
  { topic: "إثبات التسليم", person: "اسم المستلم وصورة", company: "اسم المستلم وصورة لكل شحنة، في صفحة «شركتي»" },
  { topic: "المتابعة", person: "صفحة «طلباتي»", company: "صفحة «شركتي»: طلبات الشهر، الرصيد، والمستخدمين" },
];

const STEPS: { icon: IconName; title: string; note: string }[] = [
  { icon: "file", title: "قدّم الطلب", note: "الفورم اللي تحت، في دقيقة" },
  { icon: "phone", title: "هنكلمك", note: "نتفق على السعر وطريقة الدفع" },
  { icon: "building", title: "نفتح الحساب", note: "برقم المسؤول كمدير للحساب" },
  { icon: "users", title: "ضيف موظفينك", note: "من «شركتي»، وكلهم يطلبوا" },
];

export default async function BusinessPage() {
  const session = await getSession();
  const [ctx, content] = await Promise.all([
    session ? companyContext(session.phone) : Promise.resolve(null),
    getAppContent(),
  ]);
  const wa = waDigits(content.whatsapp);

  return (
    <div className="p-4 flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <header className="flex flex-col gap-2">
        <span className="self-start rounded-full bg-primary-soft text-primary-ink px-3 py-1 text-sm font-bold">
          <Icon name="building" className="w-4 h-4 inline-block align-[-3px] me-1.5" />
          انقلي للشركات
        </span>
        <h1 className="text-[1.7rem] md:text-3xl font-extrabold leading-tight">
          نقل بضاعتك بسعر ثابت، ودفع آخر الشهر
        </h1>
        <p className="text-ink-2">
          للمحلات والموزعين والمصانع والشركات اللي بتنقل بانتظام: حساب واحد لكل موظفينك، سعر تعاقدي، كشف حساب شهري، وإثبات
          تسليم لكل شحنة.
        </p>
      </header>

      {ctx && (
        <Link
          href="/company"
          className="bg-primary-soft border border-primary/20 rounded-card p-4 flex items-center gap-3 font-bold"
        >
          <Icon name="checkCircle" className="w-5 h-5 text-primary shrink-0" />
          <span className="flex-1">رقمك مربوط بحساب {ctx.company.name}. افتح «شركتي».</span>
          <Icon name="chevronLeft" className="w-5 h-5 text-primary shrink-0" />
        </Link>
      )}

      <section aria-labelledby="compare-title" className="flex flex-col gap-3">
        <h2 id="compare-title" className="text-xl font-extrabold">
          الفرق بين الحساب الشخصي وحساب الشركة
        </h2>
        <div className="bg-panel border border-line rounded-card overflow-hidden">
          <table className="w-full text-sm md:text-base">
            <thead className="bg-panel-2 text-start">
              <tr>
                <th scope="col" className="p-3 text-start w-[24%]"></th>
                <th scope="col" className="p-3 text-start">
                  <Icon name="user" className="w-4 h-4 inline-block align-[-3px] me-1.5" />
                  شخصي
                </th>
                <th scope="col" className="p-3 text-start text-primary">
                  <Icon name="building" className="w-4 h-4 inline-block align-[-3px] me-1.5" />
                  شركة
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {COMPARE.map((r) => (
                <tr key={r.topic} className="align-top">
                  <th scope="row" className="p-3 text-start font-bold">
                    {r.topic}
                  </th>
                  <td className="p-3 text-ink-2">{r.person}</td>
                  <td className="p-3 font-semibold">{r.company}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted">
          الاتنين بنفس العربيات والسواقين بتوع انقلي، والطلب بيتعمل من نفس صفحة «اطلب توصيلة». لو رقمك مربوط بشركة، الطلب
          بيتسجّل باسمها لوحده.
        </p>
      </section>

      <section aria-labelledby="steps-title" className="flex flex-col gap-3">
        <h2 id="steps-title" className="text-xl font-extrabold">
          إزاي تفتح حساب شركة
        </h2>
        <ol className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {STEPS.map((st, i) => (
            <li key={st.title} className="bg-panel border border-line rounded-card p-3 flex flex-col gap-1.5">
              <span className="flex items-center gap-2 font-extrabold">
                <span className="w-7 h-7 rounded-full bg-primary text-white grid place-items-center text-sm">{i + 1}</span>
                <Icon name={st.icon} className="w-5 h-5 text-primary" />
              </span>
              <span className="font-bold">{st.title}</span>
              <span className="text-sm text-muted">{st.note}</span>
            </li>
          ))}
        </ol>
      </section>

      {!ctx && (
        <section
          id="apply"
          aria-labelledby="apply-title"
          className="bg-panel border border-line rounded-card p-4 md:p-5 flex flex-col gap-3"
        >
          <h2 id="apply-title" className="text-xl font-extrabold">
            اطلب حساب شركة
          </h2>
          <CompanyRequestForm
            phone={session ? (toLocal(session.phone) ?? undefined) : undefined}
            name={session?.name ?? undefined}
          />
          {(wa || content.supportPhone) && (
            <p className="text-sm text-muted">
              أو كلّمنا مباشرة:{" "}
              {content.supportPhone && (
                <a href={telHref(content.supportPhone)} className="text-primary font-bold" dir="ltr">
                  {phoneLabel(content.supportPhone)}
                </a>
              )}
              {wa && (
                <>
                  {content.supportPhone ? " · " : ""}
                  <a href={`https://wa.me/${wa}`} className="text-primary font-bold">
                    واتساب
                  </a>
                </>
              )}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
