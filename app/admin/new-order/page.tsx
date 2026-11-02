import { defaultBranch } from "@/db/lib/branches";
import { listCategories } from "@/db/lib/categories";
import { listCompanies } from "@/db/lib/companies";
import { getAppContent, getBusiness } from "@/db/lib/settings";
import { cairoDateISO } from "@/lib/time";
import { PhoneOrderForm } from "@/components/admin/PhoneOrderForm";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function NewPhoneOrderPage() {
  await requirePermission("delivery:create");
  const [cats, companies, content, business, branch] = await Promise.all([
    listCategories(),
    listCompanies(),
    getAppContent(),
    getBusiness(),
    defaultBranch(),
  ]);
  const sizes = cats.filter((c) => c.sizeCode && c.active);

  // Half-hour slots inside working hours (the server re-checks notice + hours + window).
  const times: string[] = [];
  for (let m = branch.working.open * 60; m < branch.working.close * 60; m += 30) {
    times.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold">طلب توصيل بالتليفون</h1>
        <p className="text-muted">
          للطلبات اللي بتيجي بالتليفون أو الواتساب. الطلب بيتسجّل باسم العميل ورقمه، وبيبدأ «مؤكد» على طول،
          والعميل يقدر يتابعه من «طلباتي» بنفس الرقم.
        </p>
      </div>
      <PhoneOrderForm
        sizes={sizes.map((s) => ({
          id: s.id,
          name: s.name,
          sizeCode: s.sizeCode!,
          capacityKg: s.capacityKg,
        }))}
        companies={companies
          .filter((c) => c.active)
          .map((c) => ({ id: c.id, name: c.name, billing: c.billing }))}
        cargo={content.order.cargo.map((c) => c.label)}
        maxLoaders={content.order.maxLoaders}
        minDate={cairoDateISO(new Date())}
        maxDate={cairoDateISO(new Date(Date.now() + business.advanceDays * 864e5))}
        times={times}
      />
    </div>
  );
}
