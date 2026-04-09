import type { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { cancelPaymentRequest } from "@/lib/business-logic/payment-request";
import { getServerT } from "@/lib/i18n-server";
import {
  generateIdempotencyKey,
  withIdempotency,
} from "@/lib/middleware/idempotency";
import { getStudentSessionFromRequest } from "@/lib/student-auth";

export async function POST(
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

    const idempotencyKey = generateIdempotencyKey(
      session.studentNis,
      "cancel_payment",
      { paymentRequestId: id },
    );
    const { isDuplicate, result } = await withIdempotency(
      idempotencyKey,
      async () => {
        return cancelPaymentRequest(id, session.studentNis);
      },
    );

    if (isDuplicate) {
      return successResponse({ ...result, _idempotent: true });
    }
    return successResponse(result);
  } catch (error) {
    console.error("Cancel payment request error:", error);
    if (error instanceof Error) {
      return errorResponse(error.message, "VALIDATION_ERROR", 400);
    }
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
