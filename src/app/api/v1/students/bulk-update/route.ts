import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);

  try {
    const body = await request.json();
    const { nisList, updates } = body as {
      nisList: string[];
      updates: { startJoinDate?: string };
    };

    if (!Array.isArray(nisList) || nisList.length === 0) {
      return errorResponse(
        t("student.bulk.selectAtLeastOne"),
        "VALIDATION_ERROR",
        400,
      );
    }

    const data: Record<string, unknown> = {};
    if (updates.startJoinDate) {
      data.startJoinDate = new Date(updates.startJoinDate);
    }

    if (Object.keys(data).length === 0) {
      return errorResponse(
        t("student.bulk.noUpdates"),
        "VALIDATION_ERROR",
        400,
      );
    }

    const result = await prisma.student.updateMany({
      where: { nis: { in: nisList } },
      data,
    });

    return successResponse({ updated: result.count });
  } catch (error) {
    console.error("Bulk update students error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
