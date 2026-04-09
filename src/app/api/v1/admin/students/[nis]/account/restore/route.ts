import type { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth";
import { restoreAccount } from "@/lib/business-logic/student-account";
import { getServerT } from "@/lib/i18n-server";

export async function POST(
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

    await restoreAccount(nis);

    return successResponse({ message: t("api.restoreSuccess") });
  } catch (error) {
    console.error("Restore student account error:", error);
    if (error instanceof Error) {
      return errorResponse(error.message, "VALIDATION_ERROR", 400);
    }
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
