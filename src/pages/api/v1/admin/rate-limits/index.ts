import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import {
  getRateLimitHistory,
  resetRateLimit,
} from "@/lib/services/rate-limit-service";

async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || undefined;
    const identifier = searchParams.get("identifier") || undefined;
    const limit = Number.parseInt(searchParams.get("limit") || "100", 10);

    const records = await getRateLimitHistory(action, identifier, limit);

    return successResponse({ records });
  } catch (error) {
    console.error("Get rate limit history error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const body = await request.json();
    const { action, identifier } = body;

    if (!action || !identifier) {
      return errorResponse(t("api.requiredFields"), "VALIDATION_ERROR", 400);
    }

    await resetRateLimit(action, identifier);

    return successResponse({ message: "Rate limit reset successfully" });
  } catch (error) {
    console.error("Reset rate limit error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET, POST });
