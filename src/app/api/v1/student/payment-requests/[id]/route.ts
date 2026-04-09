import type { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getPaymentRequest } from "@/lib/business-logic/payment-request";
import { getServerT } from "@/lib/i18n-server";
import { getStudentSessionFromRequest } from "@/lib/student-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const t = await getServerT(request);
  try {
    const session = await getStudentSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    const { id } = await params;
    const result = await getPaymentRequest(id, session.studentNis);
    const isCache = [
      result.status === "VERIFIED",
      result.status === "CANCELLED",
      result.status === "FAILED",
      result.expiresAt.getTime() < Date.now() - 300000,
    ].some(Boolean);
    let cacheControl: string | undefined;

    if (isCache) {
      cacheControl = "public, max-age=31536000, immutable";
    }

    return successResponse(result, undefined, cacheControl);
  } catch (error) {
    console.error("Get payment request error:", error);
    if (error instanceof Error) {
      return errorResponse(error.message, "NOT_FOUND", 404);
    }
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
