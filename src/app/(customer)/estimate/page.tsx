import { repo } from "@/data/repo";
import { DeliveryEstimator } from "@/components/DeliveryEstimator";

export const dynamic = "force-dynamic";

export default async function EstimatePage() {
  const [cats, branch] = await Promise.all([repo.listCategories(), repo.defaultBranch()]);
  const sizes = cats
    .filter((c) => c.sizeCode)
    .map((c) => ({
      id: c.id,
      name: c.name,
      sizeCode: c.sizeCode as string,
      capacityKg: c.capacityKg,
      dims: c.dims,
      description: c.description,
      image: c.image,
    }));

  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold">اطلب توصيلة</h1>
        <p className="text-muted">حدد الاستلام والتسليم، اختار حجم العربية، وحدّد الميعاد.</p>
      </div>
      {sizes.length === 0 ? (
        <div className="bg-panel border border-line rounded-card p-8 text-center text-muted">
          مفيش أحجام متاحة دلوقتي.
        </div>
      ) : (
        <DeliveryEstimator sizes={sizes} center={{ lat: branch.lat ?? 30.0444, lng: branch.lng ?? 31.2357 }} />
      )}
    </div>
  );
}
