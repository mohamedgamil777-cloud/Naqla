import { driverRatingStats } from "@/db/lib/drivers";
import { listStaff } from "@/db/lib/staff";
import { StaffManager } from "@/components/admin/StaffManager";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminStaff() {
  await requirePermission("staff:manage");
  // ratings are averaged in the database
  const [staff, ratings] = await Promise.all([listStaff(), driverRatingStats()]);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">الموظفين</h1>
      <StaffManager staff={staff} ratings={ratings} />
    </div>
  );
}
