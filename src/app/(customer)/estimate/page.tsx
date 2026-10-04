import { repo } from "@/data/repo";
import { DeliveryEstimator } from "@/components/DeliveryEstimator";

export const dynamic = "force-dynamic";

export default async function EstimatePage() {
  const [vehicles, branch] = await Promise.all([repo.listVehicles(), repo.defaultBranch()]);
  const list = vehicles
    .filter((v) => v.status !== "inactive")
    .map((v) => ({ id: v.id, name: v.name, categoryName: v.categoryName }));

  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold">احسب سعر التوصيل</h1>
        <p className="text-muted">حدد مكان الاستلام والتسليم على الخريطة، واعرف السعر التقديري قبل ما تطلب.</p>
      </div>
      {list.length === 0 ? (
        <div className="bg-panel border border-line rounded-card p-8 text-center text-muted">
          مفيش عربيات متاحة دلوقتي.
        </div>
      ) : (
        <DeliveryEstimator
          vehicles={list}
          center={{ lat: branch.lat ?? 30.0444, lng: branch.lng ?? 31.2357 }}
        />
      )}
    </div>
  );
}
