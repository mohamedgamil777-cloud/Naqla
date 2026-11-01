import { repo } from "@/data/repo";
import { CategoryManager, type CategoryUsage } from "@/components/admin/CategoryManager";

export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  const [categories, vehicles, orders] = await Promise.all([repo.listCategories(), repo.listVehicles(), repo.listDeliveryOrders()]);
  // how many vehicles / orders use each type → used types can be hidden, not deleted
  const usage: Record<string, CategoryUsage> = {};
  const bump = (id: string, k: keyof CategoryUsage) => ((usage[id] ??= { vehicles: 0, orders: 0 })[k] += 1);
  vehicles.forEach((v) => bump(v.categoryId, "vehicles"));
  orders.forEach((o) => bump(o.categoryId, "orders"));
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">أنواع العربيات</h1>
      <CategoryManager categories={categories} usage={usage} />
    </div>
  );
}
