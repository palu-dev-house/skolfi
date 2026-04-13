import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth";
import { resetPassword } from "@/lib/business-logic/student-account";
import { getServerT } from "@/lib/i18n-server";

async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nis: string }> },
) {
  const t = await getServerT(request);
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    const { nis } = await params;

    const result = await resetPassword({
      studentNis: nis,
      resetBy: session.employeeId,
    });

    return successResponse(result);
  } catch (error) {
    console.error("Reset password error:", error);
    if (error instanceof Error) {
      return errorResponse(error.message, "VALIDATION_ERROR", 400);
    }
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ POST });
