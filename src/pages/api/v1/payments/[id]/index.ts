import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { reversePayment } from "@/lib/business-logic/payment-processor";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      tuition: {
        include: {
          student: {
            select: {
              nis: true,
              schoolLevel: true,
              name: true,
              parentName: true,
              parentPhone: true,
            },
          },
          classAcademic: {
            select: {
              className: true,
              grade: true,
              section: true,
              academicYear: { select: { year: true } },
            },
          },
        },
      },
      employee: {
        select: { employeeId: true, name: true, email: true },
      },
    },
  });

  if (!payment) {
    return errorResponse(
      t("api.notFound", { resource: "Payment" }),
      "NOT_FOUND",
      404,
    );
  }

  return successResponse(payment);
}

async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Only admin can reverse payments
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { id } = await params;

  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        tuition: {
          include: {
            student: { select: { name: true } },
          },
        },
      },
    });

    if (!payment) {
      return errorResponse(
        t("api.notFound", { resource: "Payment" }),
        "NOT_FOUND",
        404,
      );
    }

    // Reverse the payment
    const result = await reversePayment(id, prisma);

    return successResponse({
      message: t("api.paymentReversed"),
      result: {
        tuitionId: result.tuitionId,
        newStatus: result.newStatus,
        newPaidAmount: result.newPaidAmount,
      },
    });
  } catch (error) {
    console.error("Delete payment error:", error);
    if (error instanceof Error) {
      return errorResponse(error.message, "VALIDATION_ERROR", 400);
    }
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET, DELETE });
