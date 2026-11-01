import { repo } from "@/data/repo";
import { DeliveryEstimator, type AccountInfo } from "@/components/DeliveryEstimator";
import { getSession } from "@/services/session";
import { addressOwner, companyContext } from "@/services/company-service";

export const dynamic = "force-dynamic";

export default async function EstimatePage({ searchParams }: { searchParams: Promise<{ size?: string }> }) {
  const { size } = await searchParams;
  const [cats, branch, business, content] = await Promise.all([
    repo.listCategories(),
    repo.defaultBranch(),
    repo.getBusiness(),
    repo.getAppContent(),
  ]);
  const session = await getSession();
  const ctx = session ? await companyContext(session.phone) : null;
  const account: AccountInfo = {
    loggedIn: !!session,
    company: ctx ? { name: ctx.company.name, discountPct: ctx.company.discountPct, billing: ctx.company.billing } : null,
    saved: session
      ? (await repo.listSavedAddresses(addressOwner(session.phone, ctx))).map((a) => ({
          id: a.id, label: a.label, address: a.address, details: a.details, lat: a.lat, lng: a.lng,
        }))
      : [],
  };
  const sizes = cats
    .filter((c) => c.sizeCode && c.active)
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
        <h1 className="text-[1.7rem] font-extrabold leading-tight">انقللي</h1>
        <p className="text-muted mt-1">أسرع وأسهل طريقة لنقل أغراضك مع سائق معتمد من انقلي</p>
      </div>
      {sizes.length === 0 ? (
        <div className="bg-panel border border-line rounded-card p-8 text-center text-muted">
          مفيش أحجام متاحة دلوقتي.
        </div>
      ) : (
        <DeliveryEstimator sizes={sizes} initialSizeCode={size} loaderFee={content.order.loaderFee} account={account}
          options={{
            hours: branch.working,
            advanceDays: business.advanceDays,
            leadHours: business.nowLeadHours,
            maxLoaders: content.order.maxLoaders,
            disclaimer: content.order.disclaimer,
            cargo: content.order.cargo,
          }}
          center={{ lat: branch.lat ?? 30.0444, lng: branch.lng ?? 31.2357 }} />
      )}
    </div>
  );
}
