import { repo } from "@/data/repo";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  const [categories, vehicles] = await Promise.all([repo.listCategories(), repo.listVehicles()]);
  const usedIds = [...new Set(vehicles.map((v) => v.categoryId))];
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">أنواع العربيات</h1>
      <CategoryManager categories={categories} usedIds={usedIds} />
    </div>
  );
}
