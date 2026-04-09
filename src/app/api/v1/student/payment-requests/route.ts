import type { NextRequest } from "next/server";
import type { PaymentRequestStatus } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  createPaymentRequest,
  listPaymentRequests,
} from "@/lib/business-logic/payment-request";
import { getServerT } from "@/lib/i18n-server";
import {
  generateIdempotencyKey,
  withIdempotency,
} from "@/lib/middleware/idempotency";
import {
  checkRateLimit,
  rateLimitErrorResponse,
} from "@/lib/middleware/rate-limit";
import { getStudentSessionFromRequest } from "@/lib/student-auth";
import { paymentRequestSchema } from "@/lib/validations";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";

export async function GET(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const session = await getStudentSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const status = searchParams.get("status") as PaymentRequestStatus | null;

    const result = await listPaymentRequests({
      studentNis: session.studentNis,
      status: status || undefined,
      page,
      limit,
    });

    return successResponse(result);
  } catch (error) {
    console.error("List payment requests error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const session = await getStudentSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    const body = await request.json();
    const parsed = await parseWithLocale(paymentRequestSchema, body, request);
    if (!parsed.success) return parsed.response;

    const { tuitionIds } = parsed.data;

    // Check rate limit (3 per minute per user)
    const rateLimitResult = await checkRateLimit(
      "paymentRequest",
      session.studentNis,
    );
    if (!rateLimitResult.success) {
      return await rateLimitErrorResponse(rateLimitResult, request);
    }

    // Get idempotency key from header or generate from payload
    const idempotencyKey =
      request.headers.get("X-Idempotency-Key") ||
      generateIdempotencyKey(session.studentNis, "CREATE_PAYMENT_REQUEST", {
        tuitionIds: tuitionIds.sort().join(","),
      });

    // Execute with idempotency check
    const { isDuplicate, result } = await withIdempotency(
      idempotencyKey,
      async () => {
        return createPaymentRequest({
          studentNis: session.studentNis,
          tuitionIds,
          idempotencyKey,
        });
      },
    );

    // Return 200 for duplicate, 201 for new
    return successResponse(result, isDuplicate ? 200 : 201);
  } catch (error) {
    console.error("Create payment request error:", error);
    if (error instanceof Error) {
      return errorResponse(error.message, "VALIDATION_ERROR", 400);
    }
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
