import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  calculateGenericOverdueSummary,
  getOverdueFeeBills,
  groupFeeBillsByStudent,
} from "@/lib/business-logic/overdue-calculator";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const sp = request.nextUrl.searchParams;
    const classAcademicId = sp.get("classAcademicId") || undefined;
    const grade = sp.get("grade") ? Number(sp.get("grade")) : undefined;
    const academicYearId = sp.get("academicYearId") || undefined;
    const schoolLevelParam = sp.get("schoolLevel");
    const schoolLevel =
      schoolLevelParam && schoolLevelParam !== "null"
        ? (schoolLevelParam as "TK" | "SD" | "SMP" | "SMA")
        : undefined;
    const studentSearch = sp.get("studentSearch") || undefined;

    const items = await getOverdueFeeBills(
      {
        classAcademicId,
        grade,
        academicYearId,
        schoolLevel,
        studentSearch,
      },
      prisma,
    );
    const overdue = groupFeeBillsByStudent(items);
    const summary = calculateGenericOverdueSummary(items);

    return successResponse({ overdue, summary });
  } catch (error) {
    console.error("Overdue fee-bill report error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET });
