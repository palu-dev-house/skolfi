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
    const { nisList } = body as { nisList: string[] };

    if (!Array.isArray(nisList) || nisList.length === 0) {
      return errorResponse(
        t("student.bulk.selectAtLeastOne"),
        "VALIDATION_ERROR",
        400,
      );
    }

    // Find students that have payments (cannot be deleted)
    const studentsWithPayments = await prisma.student.findMany({
      where: {
        nis: { in: nisList },
        tuitions: { some: { payments: { some: {} } } },
      },
      select: { nis: true, name: true },
    });

    const blockedNis = new Set(studentsWithPayments.map((s) => s.nis));
    const deletableNis = nisList.filter((nis) => !blockedNis.has(nis));

    let deleted = 0;
    if (deletableNis.length > 0) {
      const result = await prisma.student.deleteMany({
        where: { nis: { in: deletableNis } },
      });
      deleted = result.count;
    }

    return successResponse({
      deleted,
      skipped: studentsWithPayments.map((s) => ({
        nis: s.nis,
        name: s.name,
      })),
    });
  } catch (error) {
    console.error("Bulk delete students error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
