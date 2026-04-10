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

    const { count: deleted } = await prisma.scholarship.deleteMany({
      where: { id: { in: ids } },
    });

    return successResponse({ deleted });
  } catch (error) {
    console.error("Bulk delete scholarships error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
