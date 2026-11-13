import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/authz";
import { companyStatement, currentMonth } from "@/services/company-service";
import { companyReportCsv, companyReportFilename } from "@/services/company-report";
import { withErrorHandling } from "@/lib/route";

/** Admin → a company's month as an Excel (CSV) file, to send with the statement. */
export const GET = withErrorHandling(
  "GET /api/admin/companies/[id]/report",
  async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await authorizeRequest("company:manage");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const month = req.nextUrl.searchParams.get("month") ?? "";
    const st = await companyStatement(id, /^\d{4}-\d{2}$/.test(month) ? month : currentMonth()).catch(() => null);
    if (!st) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return new NextResponse(companyReportCsv(st), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        // headers are ASCII; the company's Arabic name goes in the RFC 5987 form
        "Content-Disposition": `attachment; filename="${companyReportFilename(st)}"; filename*=UTF-8''${encodeURIComponent(`${st.company.name}-${companyReportFilename(st)}`)}`,
      },
    });
  },
);
