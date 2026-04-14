import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { generateServiceFeeBills } from "@/lib/business-logic/service-fee-bills";

async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const { classAcademicId, period, year } = body as {
      classAcademicId?: string;
      period?: string;
      year?: number;
    };

    if (!period || !year) {
      return errorResponse(
        "period and year are required",
        "VALIDATION_ERROR",
        400,
      );
    }

    const result = await generateServiceFeeBills({
      classAcademicId,
      period,
      year: Number(year),
    });

    return successResponse(result);
  } catch (error) {
    console.error("Generate service fee bills error:", error);
    return errorResponse(
      "Failed to generate service fee bills",
      "SERVER_ERROR",
      500,
    );
  }
}

export default createApiHandler({ POST });
