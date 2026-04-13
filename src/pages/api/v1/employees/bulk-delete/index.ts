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

    // Find employees with payments (must be skipped)
    const employeesWithPayments = await prisma.employee.findMany({
      where: {
        employeeId: { in: ids },
        payments: { some: {} },
      },
      select: { employeeId: true, name: true },
    });

    const skippedIds = new Set(employeesWithPayments.map((e) => e.employeeId));
    const deletableIds = ids.filter((id) => !skippedIds.has(id));

    const { count: deleted } = await prisma.employee.deleteMany({
      where: { employeeId: { in: deletableIds } },
    });

    return successResponse({
      deleted,
      skipped: employeesWithPayments.map((e) => ({
        id: e.employeeId,
        name: e.name,
      })),
    });
  } catch (error) {
    console.error("Bulk delete employees error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ POST });
