import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/services/session";
import { companyContext, companyStatement, currentMonth } from "@/services/company-service";
import { CompanyStatementView } from "@/components/CompanyStatementView";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function CompanyStatementPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/company");
  const ctx = await companyContext(session.phone);
  if (!ctx) redirect("/company");
  const { month } = await searchParams;
  const m = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : currentMonth();
  const st = await companyStatement(ctx.company.id, m);
  if (!st) redirect("/company");
  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link href="/company" className="text-primary font-bold">→ رجوع</Link>
        <PrintButton />
      </div>
      <CompanyStatementView st={st} />
    </div>
  );
}
