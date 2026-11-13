import Link from "next/link";
import { notFound } from "next/navigation";
import { companyStatement, currentMonth } from "@/services/company-service";
import { CompanyTripsReport } from "@/components/CompanyTripsReport";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminCompanyTrips({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  await requirePermission("company:manage");
  const { id } = await params;
  const { month } = await searchParams;
  const m = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : currentMonth();
  const st = await companyStatement(id, m).catch(() => null);
  if (!st) notFound();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <Link href={`/admin/companies/${id}`} className="text-primary font-bold">→ رجوع للشركة</Link>
        <Link href={`/admin/companies/${id}/statement?month=${m}`} className="text-primary font-bold">كشف الحساب</Link>
      </div>
      <CompanyTripsReport st={st} downloadHref={`/api/admin/companies/${id}/report?month=${m}`} />
    </div>
  );
}
