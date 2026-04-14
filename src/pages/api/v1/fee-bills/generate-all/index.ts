import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { generateAllFeeBills } from "@/lib/business-logic/fee-bills";
import { prisma } from "@/lib/prisma";

async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const { academicYearId: requestedId } = body as {
      academicYearId?: string;
    };

    // Resolve academic year: use provided ID or fall back to the active year.
    let academicYearId = requestedId;
    if (!academicYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { isActive: true },
        select: { id: true },
        orderBy: { startDate: "desc" },
      });
      if (!activeYear) {
        return errorResponse(
          "No active academic year found. Provide academicYearId explicitly.",
          "NOT_FOUND",
          404,
        );
      }
      academicYearId = activeYear.id;
    }

    const result = await generateAllFeeBills(academicYearId);

    return successResponse(result);
  } catch (error) {
    console.error("Generate-all fee bills error:", error);
    return errorResponse("Failed to generate fee bills", "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ POST });
