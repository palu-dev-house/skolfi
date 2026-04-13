import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { getStudentSessionFromRequest } from "@/lib/student-auth";

async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const t = await getServerT(request);
  try {
    const session = await getStudentSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    const { id } = await params;

    const payment = await prisma.onlinePayment.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            tuition: {
              select: {
                id: true,
                period: true,
                year: true,
                feeAmount: true,
                paidAmount: true,
                status: true,
                classAcademic: {
                  select: {
                    className: true,
                    academicYear: { select: { year: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment || payment.studentNis !== session.studentNis) {
      return errorResponse(t("api.notFound"), "NOT_FOUND", 404);
    }

    return successResponse({ payment });
  } catch (error) {
    console.error("Get online payment detail error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET });
