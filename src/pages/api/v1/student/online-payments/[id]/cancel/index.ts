import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { errorResponse, successResponse } from "@/lib/api-response";
import { cancelOnlinePayment } from "@/lib/business-logic/online-payment-processor";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { getStudentSessionFromRequest } from "@/lib/student-auth";

async function POST(
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

    await cancelOnlinePayment(id, session.studentNis, prisma);

    return successResponse({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t("api.internalError");
    console.error("Cancel online payment error:", error);
    return errorResponse(message, "CANCEL_ERROR", 400);
  }
}

export default createApiHandler({ POST });
