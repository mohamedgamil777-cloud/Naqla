import { repo } from "@/data/repo";
import { SettingsForms } from "@/components/admin/SettingsForms";
import { requireAdminRole } from "@/services/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  await requireAdminRole(["super_admin"]);
  const [branch, business] = await Promise.all([repo.defaultBranch(), repo.getBusiness()]);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">الإعدادات</h1>
      <SettingsForms branch={branch} business={business} />
    </div>
  );
}
