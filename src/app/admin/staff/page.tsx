import { repo } from "@/data/repo";
import { StaffManager } from "@/components/admin/StaffManager";
import { requireAdminRole } from "@/services/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminStaff() {
  await requireAdminRole(["super_admin"]);
  const staff = await repo.listStaff();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">الموظفين</h1>
      <StaffManager staff={staff} />
    </div>
  );
}
