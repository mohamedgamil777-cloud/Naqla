import { repo } from "@/db/repo";
import { StaffManager } from "@/components/admin/StaffManager";
import { driverRatings } from "@/services/ratings";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminStaff() {
  await requirePermission("staff:manage");
  const [staff, orders] = await Promise.all([repo.listStaff(), repo.listDeliveryOrders()]);
  const ratings = driverRatings(orders);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">الموظفين</h1>
      <StaffManager staff={staff} ratings={ratings} />
    </div>
  );
}
