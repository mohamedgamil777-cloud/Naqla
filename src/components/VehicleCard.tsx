import Link from "next/link";
import { formatEgp } from "@/lib/money";
import { KIND_LABEL } from "@/lib/constants";
import { VehicleStatusBadge, LinkButton } from "./ui";
import { VehicleImage } from "./VehicleImage";
import type { VehicleListItem } from "@/data/types";

export function VehicleCard({ v }: { v: VehicleListItem }) {
  const bookable = v.status === "available";
  const capacity =
    v.kind === "van"
      ? `${v.seats ?? "-"} راكب`
      : `حمولة حتى ${v.cargoKg ? (v.cargoKg / 1000).toLocaleString("en") + " طن" : "-"}`;
  return (
    <div className="bg-panel border border-line rounded-card overflow-hidden shadow-sm">
      <Link href={`/vehicle/${v.id}`} className="block relative aspect-[16/9] bg-panel-2">
        <VehicleImage src={v.primaryImage} alt={v.name} sizes="(max-width:640px) 100vw, 400px" />
        <span className="absolute top-3 start-3 bg-panel/90 rounded-full px-3 py-1 text-sm font-bold">
          {v.kind === "van" ? "🚐" : "🚚"} {KIND_LABEL[v.kind]}
        </span>
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-extrabold leading-tight">{v.name}</h3>
            <p className="text-muted text-sm mt-0.5">{capacity}</p>
          </div>
          <VehicleStatusBadge status={v.status} />
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <span className="text-2xl font-extrabold text-primary">{formatEgp(v.fromHourlyPiastres, { withUnit: false })}</span>
            <span className="text-muted text-sm"> جنيه / ساعة</span>
          </div>
          {bookable ? (
            <LinkButton href={`/book?vehicle=${v.id}`} variant="accent" className="!py-2.5 !text-base">
              احجز الآن
            </LinkButton>
          ) : (
            <LinkButton href={`/vehicle/${v.id}`} variant="secondary" className="!py-2.5 !text-base">
              التفاصيل
            </LinkButton>
          )}
        </div>
      </div>
    </div>
  );
}
