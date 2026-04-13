import type { NextRequest } from "next/server";
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

    // Find classes that have students assigned (must be skipped)
    const classesWithStudents = await prisma.classAcademic.findMany({
      where: {
        id: { in: ids },
        studentClasses: { some: {} },
      },
      select: { id: true, className: true },
    });

    const skippedIds = new Set(classesWithStudents.map((c) => c.id));
    const deletableIds = ids.filter((id) => !skippedIds.has(id));

    const { count: deleted } = await prisma.classAcademic.deleteMany({
      where: { id: { in: deletableIds } },
    });

    return successResponse({
      deleted,
      skipped: classesWithStudents.map((c) => ({
        id: c.id,
        className: c.className,
      })),
    });
  } catch (error) {
    console.error("Bulk delete classes error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ POST });
