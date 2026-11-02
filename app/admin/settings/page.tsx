import { defaultBranch } from "@/db/lib/branches";
import { getBusiness } from "@/db/lib/settings";
import { SettingsForms } from "@/components/admin/SettingsForms";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  await requirePermission("settings:manage");
  const [branch, business] = await Promise.all([defaultBranch(), getBusiness()]);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">الإعدادات</h1>
      <SettingsForms branch={branch} business={business} />
    </div>
  );
}
