import Link from "next/link";
import { VehicleImage } from "@/components/VehicleImage";
import { listVehicles } from "@/db/lib/vehicles";
import { formatEgp } from "@/lib/money";
import { KIND_LABEL } from "@/lib/constants";
import { QuickStatus } from "@/components/admin/QuickStatus";
import { Icon } from "@/components/Icons";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminFleet() {
  await requirePermission("fleet:manage");
  const vehicles = await listVehicles();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">العربيات</h1>
          <p className="text-muted text-sm">{vehicles.length} عربية في الأسطول</p>
        </div>
        <Link
          href="/admin/fleet/new"
          className="rounded-2xl px-5 py-3 font-bold bg-primary text-white flex items-center gap-2"
        >
          <span className="text-xl leading-none">+</span> أضف عربية
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="bg-panel border border-line rounded-card overflow-hidden flex flex-col"
          >
            <Link href={`/admin/fleet/${v.id}/edit`} className="relative aspect-[16/9] bg-panel-2 block">
              <VehicleImage src={v.primaryImage} alt={v.name} sizes="360px" />
              <span className="absolute top-3 start-3 bg-panel/90 rounded-md px-2 py-1 text-xs font-semibold inline-flex items-center gap-1.5">
                <Icon name={v.kind === "van" ? "van" : "truck"} className="w-4 h-4" /> {KIND_LABEL[v.kind]}
              </span>
            </Link>
            <div className="p-4 flex flex-col gap-3 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold">{v.name}</div>
                  <div className="text-muted text-sm">{v.categoryName}</div>
                </div>
                <span className="text-emph font-bold whitespace-nowrap">
                  {formatEgp(v.fromHourlyPiastres)}/س
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-line">
                <QuickStatus id={v.id} status={v.status} />
                <Link href={`/admin/fleet/${v.id}/edit`} className="text-primary font-bold text-sm">
                  تعديل ›
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
