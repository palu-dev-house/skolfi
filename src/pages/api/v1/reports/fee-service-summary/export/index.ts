import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth } from "@/lib/api-auth";
import { errorResponse } from "@/lib/api-response";
import {
  type FeeServiceSummaryFilters,
  getFeeServiceSummary,
} from "@/lib/business-logic/fee-service-summary";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const searchParams = request.nextUrl.searchParams;

    const category = searchParams.get("category") || undefined;
    const billStatus = searchParams.get("billStatus") || undefined;

    const filters: FeeServiceSummaryFilters = {
      academicYearId: searchParams.get("academicYearId") || undefined,
      category:
        category === "TRANSPORT" || category === "ACCOMMODATION"
          ? category
          : undefined,
      feeServiceId: searchParams.get("feeServiceId") || undefined,
      billStatus:
        billStatus === "UNPAID" ||
        billStatus === "PARTIAL" ||
        billStatus === "PAID" ||
        billStatus === "VOID"
          ? billStatus
          : undefined,
      classId: searchParams.get("classId") || undefined,
      monthFrom: searchParams.get("monthFrom") || undefined,
      monthTo: searchParams.get("monthTo") || undefined,
      search: searchParams.get("search") || undefined,
      // Export: no pagination — request a large limit.
      page: 1,
      limit: 10000,
    };

    const result = await getFeeServiceSummary(filters, prisma);

    const rows = result.data.map((r) => ({
      "Fee Service": r.feeServiceName,
      Category: r.category,
      "Active Students": r.activeStudents,
      "Total Billed": Number(r.totalBilled),
      "Total Paid": Number(r.totalPaid),
      Outstanding: Number(r.outstanding),
      "Overdue Bills": r.overdueBills,
    }));

    rows.push({
      "Fee Service": "",
      Category: "",
      "Active Students": "",
      "Total Billed": "",
      "Total Paid": "",
      Outstanding: "",
      "Overdue Bills": "",
    } as unknown as (typeof rows)[number]);

    rows.push({
      "Fee Service": "TOTAL",
      Category: "",
      "Active Students": "",
      "Total Billed": Number(result.totals.billed),
      "Total Paid": Number(result.totals.paid),
      Outstanding: Number(result.totals.outstanding),
      "Overdue Bills": "",
    } as unknown as (typeof rows)[number]);

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 32 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, "Fee Service Summary");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const filename = `fee-service-summary-${new Date().toISOString().split("T")[0]}.xlsx`;

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Fee service summary export error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET });
