import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/services/session";
import { companyContext, companyStatement, currentMonth } from "@/services/company-service";
import { CompanyTripsReport } from "@/components/CompanyTripsReport";

export const dynamic = "force-dynamic";

/** شركتي → the month's trips on screen (company admin only), with the Excel download. */
export default async function CompanyTripsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/company");
  const ctx = await companyContext(session.phone);
  if (!ctx || ctx.member.role !== "owner") redirect("/company");
  const { month } = await searchParams;
  const m = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : currentMonth();
  const st = await companyStatement(ctx.company.id, m);
  if (!st) redirect("/company");
  return (
    <div className="p-4 flex flex-col gap-4 w-full max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/company" className="text-primary font-bold">→ رجوع</Link>
        <Link href={`/company/statement?month=${m}`} className="text-primary font-bold">كشف الحساب</Link>
      </div>
      <CompanyTripsReport st={st} downloadHref={`/company/report?month=${m}`} />
    </div>
  );
}
