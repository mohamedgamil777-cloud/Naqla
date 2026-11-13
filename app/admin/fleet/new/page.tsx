import Link from "next/link";
import { listCategories } from "@/db/lib/categories";
import { defaultPricingInput } from "@/db/lib/vehicles";
import { listDrivers } from "@/db/lib/drivers";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function NewVehiclePage() {
  await requirePermission("fleet:manage");
  const [categories, defaultPricing, drivers] = await Promise.all([
    listCategories(),
    defaultPricingInput(),
    listDrivers(),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/fleet" className="text-primary font-semibold">
          العربيات
        </Link>
        <span className="text-muted">/ إضافة عربية</span>
      </div>
      <h1 className="text-2xl font-extrabold">إضافة عربية جديدة</h1>
      <VehicleForm categories={categories} drivers={drivers} defaultPricing={defaultPricing} />
    </div>
  );
}
