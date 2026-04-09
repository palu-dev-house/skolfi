import type { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth";
import { listStudentsWithAccounts } from "@/lib/business-logic/student-account";
import { getServerT } from "@/lib/i18n-server";

export async function GET(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const search = searchParams.get("search") || undefined;

    const result = await listStudentsWithAccounts({
      page,
      limit,
      includeDeleted,
      search,
    });

    return successResponse(result);
  } catch (error) {
    console.error("List student accounts error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
