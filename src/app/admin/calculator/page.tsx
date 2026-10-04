import { repo } from "@/data/repo";
import { Calculator } from "@/components/admin/Calculator";

export const dynamic = "force-dynamic";

export default async function CalculatorPage() {
  const vehicles = await repo.listVehicles();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">حاسبة السعر</h1>
      <p className="text-muted -mt-2">احسب تكلفة الرحلة بالوقت والمسافة قبل الحجز أو عند التسليم.</p>
      <Calculator vehicles={vehicles} />
    </div>
  );
}
