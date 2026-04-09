import type { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getActiveBankAccounts } from "@/lib/business-logic/bank-account";
import { getServerT } from "@/lib/i18n-server";

export async function GET(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const banks = await getActiveBankAccounts();
    return successResponse({ banks });
  } catch (error) {
    console.error("Get banks error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
