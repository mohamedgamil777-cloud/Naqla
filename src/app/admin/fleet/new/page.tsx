import Link from "next/link";
import { repo } from "@/data/repo";
import { VehicleForm } from "@/components/admin/VehicleForm";

export const dynamic = "force-dynamic";

export default async function NewVehiclePage() {
  const [categories, defaultPricing] = await Promise.all([
    repo.listCategories(),
    repo.defaultPricingInput(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/fleet" className="text-primary font-semibold">العربيات</Link>
        <span className="text-muted">/ إضافة عربية</span>
      </div>
      <h1 className="text-2xl font-extrabold">إضافة عربية جديدة</h1>
      <VehicleForm categories={categories} defaultPricing={defaultPricing} />
    </div>
  );
}
