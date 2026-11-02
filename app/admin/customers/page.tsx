import { verifyCustomerPhoneAction } from "@/actions/admin/accounts";
import { z } from "zod";
import { searchCustomers } from "@/db/lib/accounts";
import { requirePermission } from "@/lib/authz";
import { labelDateArabic } from "@/lib/time";
import { CustomerPasswordForm } from "@/components/admin/CustomerPasswordForm";
import { Pagination, listHref } from "@/components/Pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const Query = z.object({
  q: z.string().trim().max(60).catch(""),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

/** Agents: find a customer, confirm the number by phone call, reset a forgotten password. */
export default async function AdminCustomers({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("customer:manage");
  const { q, page } = Query.parse(await searchParams);
  const result = await searchCustomers(q, page, PAGE_SIZE);
  const href = (p: number) => listHref("/admin/customers", { q, page: p });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold">العملاء</h1>
        <p className="text-muted text-sm mt-1">
          اتصل بالعميل وأكّد إن الرقم بتاعه، وبعدين دوس «تأكيد الرقم». ولو نسي كلمة السر اعمله كلمة سر مؤقتة
          وقولهاله.
        </p>
      </div>

      <form className="flex gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="دوّر بالرقم أو الاسم"
          className="flex-1 rounded-xl border border-line-2 bg-panel px-3 py-2.5 outline-none focus:border-primary"
        />
        <button className="rounded-xl px-5 py-2.5 font-bold bg-primary text-white">بحث</button>
      </form>

      <p className="text-sm text-muted">
        {result.total} عميل{q ? ` للبحث «${q}»` : ""}
      </p>

      <div className="flex flex-col gap-3">
        {result.rows.map((c) => (
          <div key={c.id} className="bg-panel border border-line rounded-card p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-extrabold">{c.name || "بدون اسم"}</p>
                <p className="text-muted text-sm" dir="ltr">
                  {c.phone.replace(/^\+20/, "0")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span
                  className={`rounded-full px-2.5 py-1 ${c.phoneVerifiedAt ? "bg-ok-soft text-ok" : "bg-reserved-soft text-reserved"}`}
                >
                  {c.phoneVerifiedAt ? "رقم مؤكد" : "رقم غير مؤكد"}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 ${c.hasPassword ? "bg-primary-soft text-primary-ink" : "bg-panel-2 text-muted"}`}
                >
                  {c.hasPassword ? "عنده كلمة سر" : "لسه معملش كلمة سر"}
                </span>
                <span className="text-muted font-normal">من {labelDateArabic(c.createdAt)}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-3">
              <form action={verifyCustomerPhoneAction}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="verified" value={c.phoneVerifiedAt ? "0" : "1"} />
                <button
                  className={`rounded-xl px-4 py-2 font-bold ${c.phoneVerifiedAt ? "border border-line-2 text-muted" : "bg-ok text-white"}`}
                >
                  {c.phoneVerifiedAt ? "إلغاء التأكيد" : "تأكيد الرقم"}
                </button>
              </form>
              <CustomerPasswordForm id={c.id} />
            </div>
          </div>
        ))}
        {result.rows.length === 0 && <p className="text-muted p-4">مفيش عملاء{q ? " بالبحث ده" : ""}.</p>}
      </div>

      <Pagination page={result.page} totalPages={result.totalPages} href={href} />
    </div>
  );
}
