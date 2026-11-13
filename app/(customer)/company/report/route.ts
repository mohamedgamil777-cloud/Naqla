import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/services/session";
import { companyContext, companyStatement, currentMonth } from "@/services/company-service";
import { companyReportCsv, companyReportFilename } from "@/services/company-report";
import { withErrorHandling } from "@/lib/route";

/** شركتي → the month's trips as an Excel (CSV) file. Company admin only. */
export const GET = withErrorHandling("GET /company/report", async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  const ctx = await companyContext(session.phone);
  if (!ctx || ctx.member.role !== "owner") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const month = req.nextUrl.searchParams.get("month") ?? "";
  const st = await companyStatement(ctx.company.id, /^\d{4}-\d{2}$/.test(month) ? month : currentMonth());
  if (!st) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return new NextResponse(companyReportCsv(st), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${companyReportFilename(st)}"`,
    },
  });
});
