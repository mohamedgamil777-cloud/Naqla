import { categoryUsage, listCategories } from "@/db/lib/categories";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  await requirePermission("category:manage");
  // how many vehicles / orders use each type (counted in the database) → used types can be hidden, not deleted
  const [categories, usage] = await Promise.all([listCategories(), categoryUsage()]);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">أنواع العربيات</h1>
      <CategoryManager categories={categories} usage={usage} />
    </div>
  );
}
