import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { generateAllServiceFeeBills } from "@/lib/business-logic/service-fee-bills";

async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const { academicYearId } = body as { academicYearId?: string };

    const result = await generateAllServiceFeeBills({ academicYearId });

    return successResponse(result);
  } catch (error) {
    console.error("Generate-all service fee bills error:", error);
    return errorResponse(
      "Failed to generate service fee bills",
      "SERVER_ERROR",
      500,
    );
  }
}

export default createApiHandler({ POST });
