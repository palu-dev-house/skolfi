import type { NextRequest } from "next/server";
import type { PaymentStatus } from "@/generated/prisma/client";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);

  try {
    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(t("api.validationError"), "VALIDATION_ERROR", 400);
    }

    const reversed = await prisma.$transaction(async (tx) => {
      let count = 0;

      for (const paymentId of ids) {
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
          include: { tuition: true },
        });

        if (!payment) continue;

        const tuition = payment.tuition;
        if (!tuition) continue;

        // Delete the payment first
        await tx.payment.delete({ where: { id: paymentId } });

        // Recalculate paidAmount from remaining payments
        const remaining = await tx.payment.aggregate({
          where: { tuitionId: tuition.id },
          _sum: { amount: true },
        });

        const newPaidAmount = Number(remaining._sum.amount ?? 0);

        // Recalculate effective fee for status determination
        const scholarships = await tx.scholarship.findMany({
          where: {
            studentNis: tuition.studentNis,
            classAcademicId: tuition.classAcademicId,
          },
        });

        const feeAmount = Number(tuition.feeAmount);
        const scholarshipAmount = scholarships.reduce(
          (sum, s) => sum + Number(s.nominal),
          0,
        );
        const discountAmount = Number(tuition.discountAmount) || 0;
        const effectiveFeeAmount = Math.max(
          feeAmount - scholarshipAmount - discountAmount,
          0,
        );

        let newStatus: PaymentStatus;
        if (newPaidAmount >= effectiveFeeAmount) {
          newStatus = "PAID";
        } else if (newPaidAmount > 0) {
          newStatus = "PARTIAL";
        } else {
          newStatus = "UNPAID";
        }

        await tx.tuition.update({
          where: { id: tuition.id },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
          },
        });

        count++;
      }

      return count;
    });

    return successResponse({ reversed });
  } catch (error) {
    console.error("Bulk reverse payments error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ POST });
