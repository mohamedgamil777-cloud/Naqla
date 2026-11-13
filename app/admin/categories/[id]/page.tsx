import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryUsage, listCategories } from "@/db/lib/categories";
import { CategoryForm } from "@/components/admin/CategoryManager";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("category:manage");
  const { id } = await params;
  const [categories, usage] = await Promise.all([listCategories(), categoryUsage()]);
  const c = categories.find((x) => x.id === id);
  if (!c) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/categories" className="text-primary font-semibold">
          الأنواع
        </Link>
        <span className="text-muted">/ {c.name}</span>
      </div>
      <h1 className="text-2xl font-extrabold">{c.name}</h1>
      <CategoryForm key={c.id} c={c} use={usage[c.id] ?? { vehicles: 0, orders: 0 }} />
    </div>
  );
}
