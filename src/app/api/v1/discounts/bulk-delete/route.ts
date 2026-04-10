import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);

  try {
    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(
        t("api.validationError"),
        "VALIDATION_ERROR",
        400,
      );
    }

    // Find discounts applied to tuitions (must be skipped)
    const discountsWithTuitions = await prisma.discount.findMany({
      where: {
        id: { in: ids },
        tuitions: { some: {} },
      },
      select: { id: true, name: true },
    });

    const skippedIds = new Set(discountsWithTuitions.map((d) => d.id));
    const deletableIds = ids.filter((id) => !skippedIds.has(id));

    const { count: deleted } = await prisma.discount.deleteMany({
      where: { id: { in: deletableIds } },
    });

    return successResponse({
      deleted,
      skipped: discountsWithTuitions.map((d) => ({
        id: d.id,
        name: d.name,
      })),
    });
  } catch (error) {
    console.error("Bulk delete discounts error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
