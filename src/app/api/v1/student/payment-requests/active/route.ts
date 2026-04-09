import type { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getActivePaymentRequest } from "@/lib/business-logic/payment-request";
import { getServerT } from "@/lib/i18n-server";
import { getStudentSessionFromRequest } from "@/lib/student-auth";

export async function GET(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const session = await getStudentSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    const result = await getActivePaymentRequest(session.studentNis);

    return successResponse(result);
  } catch (error) {
    console.error("Get active payment request error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
