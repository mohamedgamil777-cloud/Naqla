import Link from "next/link";
import { repo } from "@/data/repo";
import { requireAdminRole } from "@/services/admin-auth";
import { ContentForms } from "@/components/admin/ContentForms";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  await requireAdminRole(["super_admin"]);
  const [content, cats] = await Promise.all([repo.getAppContent(), repo.listCategories()]);
  const sizeCodes = cats
    .filter((c) => c.sizeCode)
    .sort((a, b) => a.sort - b.sort)
    .map((c) => ({ code: c.sizeCode as string, name: c.name }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold">محتوى التطبيق</h1>
        <p className="text-muted">
          كل اللي العميل والسواق بيشوفوه: أرقام التواصل، الرئيسية، شاشة الطلب، والأسئلة الشائعة. صور وأسعار العربيات من{" "}
          <Link href="/admin/categories" className="text-primary font-bold">الأنواع</Link>، ومواعيد الشغل من{" "}
          <Link href="/admin/settings" className="text-primary font-bold">الإعدادات</Link>.
        </p>
      </div>
      {!content.supportPhone || !content.whatsapp ? (
        <div className="bg-rented-soft text-rented rounded-xl px-4 py-3 font-bold">
          ⚠️ أرقام التواصل لسه متحطّتش — العملاء مش هيعرفوا يكلّموك. اكتبها تحت.
        </div>
      ) : null}
      <ContentForms content={content} sizeCodes={sizeCodes} />
    </div>
  );
}
