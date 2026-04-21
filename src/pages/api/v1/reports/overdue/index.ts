import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  calculateOverdueSummary,
  getOverdueTuitions,
  groupOverdueByStudent,
} from "@/lib/business-logic/overdue-calculator";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const searchParams = request.nextUrl.searchParams;
    const classAcademicId = searchParams.get("classAcademicId") || undefined;
    const grade = searchParams.get("grade")
      ? Number(searchParams.get("grade"))
      : undefined;
    const academicYearId = searchParams.get("academicYearId") || undefined;
    const schoolLevelParam = searchParams.get("schoolLevel");
    const schoolLevel =
      schoolLevelParam && schoolLevelParam !== "null"
        ? (schoolLevelParam as "TK" | "SD" | "SMP" | "SMA")
        : undefined;
    const studentSearch = searchParams.get("studentSearch") || undefined;

    // Get overdue items
    const overdueItems = await getOverdueTuitions(
      {
        classAcademicId,
        grade,
        academicYearId,
        schoolLevel,
        studentSearch,
      },
      prisma,
    );

    // Get student details for grouping
    const studentIdList = [...new Set(overdueItems.map((i) => i.studentId))];
    const students = await prisma.student.findMany({
      where: { id: { in: studentIdList } },
      select: { id: true, parentName: true },
    });
    const studentDetails = new Map(
      students.map((s) => [s.id, { parentName: s.parentName }]),
    );

    // Group by student
    const overdueByStudent = groupOverdueByStudent(
      overdueItems,
      studentDetails,
    );

    // Calculate summary
    const summary = calculateOverdueSummary(overdueItems);

    return successResponse({
      overdue: overdueByStudent,
      summary,
    });
  } catch (error) {
    console.error("Overdue report error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET });
