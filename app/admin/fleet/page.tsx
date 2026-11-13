import Link from "next/link";
import { VehicleImage } from "@/components/VehicleImage";
import { listFleet } from "@/db/lib/vehicles";
import { formatEgp } from "@/lib/money";
import { KIND_LABEL } from "@/lib/constants";
import { QuickStatus } from "@/components/admin/QuickStatus";
import { Icon } from "@/components/Icons";
import { requirePermission } from "@/lib/authz";
import type { FleetVehicle } from "@/types";

export const dynamic = "force-dynamic";

/** Admin → العربيات: the actual vehicles (plate, driver, owner). Types live in «الأنواع». */
export default async function AdminFleet() {
  await requirePermission("fleet:manage");
  const vehicles = await listFleet();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">العربيات</h1>
          <p className="text-muted text-sm">
            {vehicles.length} عربية في الأسطول · الأنواع اللي بتظهر للعملاء في{" "}
            <Link href="/admin/categories" className="text-primary font-bold">
              الأنواع
            </Link>
          </p>
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
          <FleetCard key={v.id} v={v} />
        ))}
      </div>
    </div>
  );
}

function licenseState(expiry: string | null): { label: string; cls: string } | null {
  if (!expiry) return null;
  const days = Math.floor((new Date(`${expiry}T00:00:00Z`).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: "الرخصة منتهية", cls: "bg-booked-soft text-booked" };
  if (days <= 30) return { label: `الرخصة بتخلص بعد ${days} يوم`, cls: "bg-off-soft text-off" };
  return null;
}

function Avatar({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="w-11 h-11 rounded-full overflow-hidden bg-panel-2 border border-line-2 grid place-items-center shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <Icon name="user" className="w-5 h-5 text-muted" />
      )}
    </div>
  );
}

function FleetCard({ v }: { v: FleetVehicle }) {
  const lic = licenseState(v.admin.licenseExpiry);
  const owner = v.admin.ownerIsDriver
    ? v.driver
      ? { name: v.driver.name, phone: v.driver.phone, photo: v.driver.photo }
      : null
    : { name: v.admin.ownerName ?? "", phone: v.admin.ownerPhone ?? "", photo: v.admin.ownerPhoto };

  return (
    <div className="bg-panel border border-line rounded-card overflow-hidden flex flex-col">
      <Link href={`/admin/fleet/${v.id}/edit`} className="relative aspect-[16/9] bg-panel-2 block">
        <VehicleImage src={v.primaryImage} alt={v.name} sizes="360px" />
        <span className="absolute top-3 start-3 bg-panel/90 rounded-md px-2 py-1 text-xs font-semibold inline-flex items-center gap-1.5">
          <Icon name={v.kind === "van" ? "van" : "truck"} className="w-4 h-4" /> {KIND_LABEL[v.kind]}
        </span>
        <span
          className="absolute bottom-3 end-3 bg-panel rounded-md border-2 border-ink px-2 py-0.5 text-sm font-extrabold tracking-wide"
          dir="auto"
        >
          {v.plate}
        </span>
      </Link>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-extrabold">{v.name}</div>
            <div className="text-muted text-sm">{v.categoryName}</div>
          </div>
          <span className="text-emph font-bold whitespace-nowrap">{formatEgp(v.fromHourlyPiastres)}/س</span>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-3">
            <Avatar src={v.driver?.photo ?? null} alt={v.driver?.name ?? "السواق"} />
            <div className="min-w-0">
              <div className="text-xs text-muted">
                السواق{v.admin.ownerIsDriver && v.driver ? " (صاحب العربية)" : ""}
              </div>
              {v.driver ? (
                <>
                  <div className="font-bold truncate">{v.driver.name || "—"}</div>
                  <div className="text-muted text-xs" dir="ltr">
                    {v.driver.phone}
                  </div>
                </>
              ) : (
                <div className="text-off font-bold">مفيش سواق متسجل</div>
              )}
            </div>
          </div>
          {!v.admin.ownerIsDriver && owner && (
            <div className="flex items-center gap-3">
              <Avatar src={owner.photo} alt={owner.name || "صاحب العربية"} />
              <div className="min-w-0">
                <div className="text-xs text-muted">صاحب العربية</div>
                <div className="font-bold truncate">{owner.name || "—"}</div>
                {owner.phone && (
                  <div className="text-muted text-xs" dir="ltr">
                    {owner.phone}
                  </div>
                )}
              </div>
            </div>
          )}
          {lic && (
            <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-bold ${lic.cls}`}>
              {lic.label}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-line">
          <QuickStatus id={v.id} status={v.status} />
          <Link href={`/admin/fleet/${v.id}/edit`} className="text-primary font-bold text-sm">
            تعديل ›
          </Link>
        </div>
      </div>
    </div>
  );
}
