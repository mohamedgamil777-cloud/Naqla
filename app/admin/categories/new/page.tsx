import Link from "next/link";
import { CategoryForm } from "@/components/admin/CategoryManager";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage() {
  await requirePermission("category:manage");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/categories" className="text-primary font-semibold">
          الأنواع
        </Link>
        <span className="text-muted">/ نوع جديد</span>
      </div>
      <h1 className="text-2xl font-extrabold">نوع جديد</h1>
      <CategoryForm />
    </div>
  );
}
