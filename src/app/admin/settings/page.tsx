import { repo } from "@/data/repo";
import { SettingsForms } from "@/components/admin/SettingsForms";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  const [branch, business] = await Promise.all([repo.defaultBranch(), repo.getBusiness()]);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">الإعدادات</h1>
      <SettingsForms branch={branch} business={business} />
    </div>
  );
}
