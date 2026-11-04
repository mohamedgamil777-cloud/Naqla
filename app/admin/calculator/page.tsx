import { listVehicles } from "@/db/lib/vehicles";
import { Calculator } from "@/components/admin/Calculator";
import { TripCalculator } from "@/components/admin/TripCalculator";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function CalculatorPage() {
  await requirePermission("pricing:calculate");
  const vehicles = await listVehicles();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">حاسبة السعر</h1>
      <p className="text-muted -mt-2">
        احسب السعر الثابت لرحلة النقل: العربية + المسافة + الوقت + العمالة + الأدوار + الإضافات.
      </p>
      <TripCalculator />

      <h2 id="rental" className="text-xl font-extrabold mt-6">
        حاسبة الإيجار بالساعة
      </h2>
      <p className="text-muted -mt-2">احسب تكلفة إيجار العربية بالوقت والمسافة قبل الحجز أو عند التسليم.</p>
      <Calculator vehicles={vehicles} />
    </div>
  );
}
