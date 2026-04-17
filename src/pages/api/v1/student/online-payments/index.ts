import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { errorResponse, successResponse } from "@/lib/api-response";
import { createOnlinePayment } from "@/lib/business-logic/online-payment-processor";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { getStudentSessionFromRequest } from "@/lib/student-auth";
import { createOnlinePaymentSchema } from "@/lib/validations/schemas/online-payment.schema";

async function POST(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const session = await getStudentSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    const body = await request.json();
    const parsed = createOnlinePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        t("api.validationError"),
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await createOnlinePayment(
      {
        studentId: session.studentId,
        items: parsed.data.items,
      },
      prisma,
    );

    return successResponse(result, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t("api.internalError");
    console.error("Create online payment error:", error);
    return errorResponse(message, "PAYMENT_ERROR", 400);
  }
}

async function GET(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const session = await getStudentSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const payments = await prisma.onlinePayment.findMany({
      where: {
        studentId: session.studentId,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { createdAt: "desc" },
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
            feeBill: {
              select: {
                id: true,
                period: true,
                year: true,
                amount: true,
                paidAmount: true,
                status: true,
                feeService: {
                  select: { id: true, name: true, category: true },
                },
              },
            },
            serviceFeeBill: {
              select: {
                id: true,
                period: true,
                year: true,
                amount: true,
                paidAmount: true,
                status: true,
                serviceFee: { select: { id: true, name: true } },
                classAcademic: { select: { className: true } },
              },
            },
          },
        },
      },
    });

    return successResponse({ payments });
  } catch (error) {
    console.error("Get online payments error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET, POST });
