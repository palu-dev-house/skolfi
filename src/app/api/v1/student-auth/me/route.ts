import type { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getStudentProfile } from "@/lib/business-logic/student-account";
import { getServerT } from "@/lib/i18n-server";
import { getStudentSessionFromRequest } from "@/lib/student-auth";

export async function GET(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const session = await getStudentSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    const profile = await getStudentProfile(session.studentNis);

    return successResponse(profile);
  } catch (error) {
    console.error("Get student profile error:", error);
    if (error instanceof Error) {
      return errorResponse(error.message, "NOT_FOUND", 404);
    }
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
