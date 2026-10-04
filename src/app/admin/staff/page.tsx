import { repo } from "@/data/repo";
import { StaffManager } from "@/components/admin/StaffManager";

export const dynamic = "force-dynamic";

export default async function AdminStaff() {
  const staff = await repo.listStaff();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">الموظفين</h1>
      <StaffManager staff={staff} />
    </div>
  );
}
