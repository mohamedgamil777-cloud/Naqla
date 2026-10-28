import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/services/admin-auth";
import { companyStatement, currentMonth } from "@/services/company-service";
import { CompanyStatementView } from "@/components/CompanyStatementView";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function AdminCompanyStatement({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdminRole(["super_admin", "finance"]);
  const { id } = await params;
  const { month } = await searchParams;
  const m = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : currentMonth();
  const st = await companyStatement(id, m);
  if (!st) notFound();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link href={`/admin/companies/${id}`} className="text-primary font-bold">→ رجوع للشركة</Link>
        <PrintButton />
      </div>
      <CompanyStatementView st={st} />
    </div>
  );
}
