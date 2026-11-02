import { deleteVehicleAction } from "@/actions/admin/vehicles";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listVehicleBlocks } from "@/db/lib/availability";
import { listCategories } from "@/db/lib/categories";
import { getVehicleForEdit } from "@/db/lib/vehicles";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { VehicleBlocks, type BlockRow } from "@/components/admin/VehicleBlocks";
import { labelDateArabic, labelTime } from "@/lib/time";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("fleet:manage");
  const { id } = await params;
  const [vehicle, categories, blocks] = await Promise.all([
    getVehicleForEdit(id),
    listCategories(),
    listVehicleBlocks(id),
  ]);
  if (!vehicle) notFound();

  const blockRows: BlockRow[] = blocks.map((b) => ({
    id: b.id,
    reason: b.reason,
    label: `${labelDateArabic(b.startsAt)} · ${labelTime(b.startsAt)} → ${labelTime(b.endsAt)}`,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/fleet" className="text-primary font-semibold">
          العربيات
        </Link>
        <span className="text-muted">/ تعديل</span>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">تعديل: {vehicle.name}</h1>
        <form
          action={deleteVehicleAction}
          title="لو العربية عليها حجوزات هتتعطّل (غير متاحة) بدل ما تتحذف نهائياً"
        >
          <input type="hidden" name="id" value={vehicle.id} />
          <button className="text-booked font-bold text-sm border-2 border-booked-soft rounded-xl px-4 py-2 hover:bg-booked-soft">
            حذف العربية
          </button>
        </form>
      </div>
      <VehicleForm categories={categories} vehicle={vehicle} />
      <VehicleBlocks vehicleId={vehicle.id} blocks={blockRows} />
    </div>
  );
}
