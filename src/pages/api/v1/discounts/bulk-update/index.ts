import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

async function PUT(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);

  try {
    const body = await request.json();
    const { ids, updates } = body as {
      ids: string[];
      updates: { discountAmount?: number; isActive?: boolean };
    };

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(t("api.validationError"), "VALIDATION_ERROR", 400);
    }

    if (!updates || Object.keys(updates).length === 0) {
      return errorResponse(t("api.validationError"), "VALIDATION_ERROR", 400);
    }

    const { count: updated } = await prisma.discount.updateMany({
      where: { id: { in: ids } },
      data: updates,
    });

    return successResponse({ updated });
  } catch (error) {
    console.error("Bulk update discounts error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ PUT });
