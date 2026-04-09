import type { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { changePassword } from "@/lib/business-logic/student-account";
import { getServerT } from "@/lib/i18n-server";
import {
  checkRateLimit,
  rateLimitErrorResponse,
} from "@/lib/middleware/rate-limit";
import { getStudentSessionFromRequest } from "@/lib/student-auth";
import { changePasswordSchema } from "@/lib/validations";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";

export async function POST(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const session = await getStudentSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    // Check rate limit (3 per minute)
    const rateLimitResult = await checkRateLimit(
      "changePassword",
      session.studentNis,
    );
    if (!rateLimitResult.success) {
      return await rateLimitErrorResponse(rateLimitResult, request);
    }

    const body = await request.json();
    const parsed = await parseWithLocale(changePasswordSchema, body, request);
    if (!parsed.success) return parsed.response;

    const { currentPassword, newPassword } = parsed.data;

    await changePassword({
      studentNis: session.studentNis,
      currentPassword,
      newPassword,
    });

    return successResponse({ message: t("api.passwordChanged") });
  } catch (error) {
    console.error("Change password error:", error);
    if (error instanceof Error) {
      return errorResponse(error.message, "VALIDATION_ERROR", 400);
    }
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
