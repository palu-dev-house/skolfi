import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  applyDiscountToTuitions,
  previewDiscountApplication,
} from "@/lib/business-logic/discount-processor";
import { getServerT } from "@/lib/i18n-server";
import {
  generateIdempotencyKey,
  withIdempotency,
} from "@/lib/middleware/idempotency";
import { prisma } from "@/lib/prisma";
import { discountApplySchema } from "@/lib/validations";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";

async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const body = await request.json();
    const parsed = await parseWithLocale(discountApplySchema, body, request);
    if (!parsed.success) return parsed.response;

    const { discountId } = parsed.data;
    const { preview } = body;

    // Check if discount exists
    const discount = await prisma.discount.findUnique({
      where: { id: discountId },
      include: {
        academicYear: { select: { year: true } },
        classAcademic: { select: { className: true } },
      },
    });

    if (!discount) {
      return errorResponse(
        t("api.notFound", { resource: "Discount" }),
        "NOT_FOUND",
        404,
      );
    }

    if (!discount.isActive) {
      return errorResponse(t("api.discountInactive"), "VALIDATION_ERROR", 400);
    }

    // Preview mode - show what would be affected
    if (preview) {
      const previewResult = await previewDiscountApplication(
        discountId,
        prisma,
      );

      return successResponse({
        preview: true,
        discount: {
          id: discount.id,
          name: discount.name,
          discountAmount: Number(discount.discountAmount),
          targetPeriods: discount.targetPeriods,
          scope: discount.classAcademicId
            ? discount.classAcademic?.className
            : "School-wide",
        },
        affectedTuitions: previewResult.tuitions.map((t) => ({
          id: t.id,
          studentName: (t as { student?: { name: string } }).student?.name,
          studentNis: t.studentNis,
          className: (t as { classAcademic?: { className: string } })
            .classAcademic?.className,
          period: t.period,
          year: t.year,
          currentDiscountAmount: Number(t.discountAmount),
        })),
        summary: {
          tuitionCount: previewResult.tuitionCount,
          totalDiscountAmount: previewResult.totalDiscountAmount,
        },
      });
    }

    // Apply the discount
    const idempotencyKey = generateIdempotencyKey(
      auth.employeeId,
      "apply_discount",
      { discountId },
    );
    const { isDuplicate, result } = await withIdempotency(
      idempotencyKey,
      async () => {
        const results = await applyDiscountToTuitions(discountId, prisma);
        return {
          applied: true,
          discount: {
            id: discount.id,
            name: discount.name,
            discountAmount: Number(discount.discountAmount),
          },
          results: {
            tuitionsUpdated: results.length,
            totalDiscountApplied: results.reduce(
              (sum, r) => sum + r.discountAmount,
              0,
            ),
            details: results.slice(0, 100), // Limit details to first 100
          },
        };
      },
    );

    if (isDuplicate) {
      return successResponse({ ...result, _idempotent: true });
    }
    return successResponse(result);
  } catch (error) {
    console.error("Apply discount error:", error);
    const message =
      error instanceof Error ? error.message : t("api.internalError");
    return errorResponse(message, "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ POST });
