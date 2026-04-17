import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { getStudentSessionFromRequest } from "@/lib/student-auth";

async function GET(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const session = await getStudentSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    // Get tuitions with pending payment info
    const tuitions = await prisma.tuition.findMany({
      where: {
        studentId: session.studentId,
      },
      orderBy: [{ dueDate: "asc" }],
      select: {
        id: true,
        period: true,
        year: true,
        feeAmount: true,
        paidAmount: true,
        scholarshipAmount: true,
        discountAmount: true,
        status: true,
        dueDate: true,
        classAcademic: {
          select: {
            id: true,
            className: true,
            academicYear: {
              select: {
                id: true,
                year: true,
              },
            },
          },
        },
      },
    });

    // Transform and calculate remaining amount for each tuition
    const tuitionsWithRemaining = tuitions.map((t) => ({
      id: t.id,
      period: t.period,
      year: t.year,
      feeAmount: t.feeAmount,
      scholarshipAmount: t.scholarshipAmount,
      discountAmount: t.discountAmount,
      paidAmount: t.paidAmount,
      status: t.status,
      dueDate: t.dueDate,
      className: t.classAcademic.className,
      academicYear: t.classAcademic.academicYear.year,
      remainingAmount:
        Number(t.feeAmount) -
        Number(t.paidAmount) -
        Number(t.scholarshipAmount) -
        Number(t.discountAmount),
    }));

    return successResponse({ tuitions: tuitionsWithRemaining });
  } catch (error) {
    console.error("Get tuitions error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET });
