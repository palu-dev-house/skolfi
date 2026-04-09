import type { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { loginStudent } from "@/lib/business-logic/student-account";
import { getServerT } from "@/lib/i18n-server";
import {
  checkRateLimit,
  rateLimitErrorResponse,
} from "@/lib/middleware/rate-limit";
import { signStudentToken } from "@/lib/student-auth";
import { studentLoginSchema } from "@/lib/validations";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";

export async function POST(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const body = await request.json();
    const parsed = await parseWithLocale(studentLoginSchema, body, request);
    if (!parsed.success) return parsed.response;

    const { nis, password } = parsed.data;

    // Check rate limit (3 attempts per minute per NIS)
    const rateLimitResult = await checkRateLimit("login", nis);
    if (!rateLimitResult.success) {
      return await rateLimitErrorResponse(rateLimitResult, request);
    }

    const result = await loginStudent({ nis, password });

    if (!result.success || !result.student) {
      return errorResponse(t("api.invalidCredentials"), "UNAUTHORIZED", 401);
    }

    const token = await signStudentToken({
      studentNis: result.student.nis,
      studentName: result.student.name,
    });

    const response = successResponse({
      message: t("api.loginSuccess"),
      mustChangePassword: result.student.mustChangePassword,
      user: {
        studentNis: result.student.nis,
        studentName: result.student.name,
      },
    });

    response.headers.set(
      "Set-Cookie",
      `student-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`,
    );

    return response;
  } catch (error) {
    console.error("Student login error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
