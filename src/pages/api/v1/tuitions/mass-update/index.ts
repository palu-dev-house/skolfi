import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { tuitionMassUpdateSchema } from "@/lib/validations/schemas/tuition.schema";

async function PUT(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);

  try {
    const body = await request.json();
    const parsed = tuitionMassUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message || "Validation error",
        "VALIDATION_ERROR",
        400,
      );
    }

    const { tuitionIds, status } = parsed.data;

    // Verify all tuitions exist
    const tuitions = await prisma.tuition.findMany({
      where: { id: { in: tuitionIds } },
      select: {
        id: true,
        status: true,
        _count: { select: { payments: true } },
      },
    });

    if (tuitions.length !== tuitionIds.length) {
      return errorResponse(
        t("api.notFound", { resource: "Tuition" }),
        "NOT_FOUND",
        404,
      );
    }

    // When setting to VOID, ensure no tuition has existing payments
    if (status === "VOID") {
      const withPayments = tuitions.filter((t) => t._count.payments > 0);
      if (withPayments.length > 0) {
        return errorResponse(
          t("tuition.massUpdate.cannotVoidWithPayments"),
          "VALIDATION_ERROR",
          400,
        );
      }
    }

    // Perform the mass update
    const result = await prisma.tuition.updateMany({
      where: { id: { in: tuitionIds } },
      data: {
        status,
        // When voiding, zero out amounts
        ...(status === "VOID" ? { paidAmount: 0, feeAmount: 0 } : {}),
      },
    });

    return successResponse({
      updated: result.count,
      status,
    });
  } catch (error) {
    console.error("Mass update tuition error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ PUT });
