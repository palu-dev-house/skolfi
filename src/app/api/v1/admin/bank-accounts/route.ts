import type { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth";
import {
  createBankAccount,
  getAllBankAccounts,
} from "@/lib/business-logic/bank-account";
import { getServerT } from "@/lib/i18n-server";
import { bankAccountSchema } from "@/lib/validations";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";

export async function GET(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    const bankAccounts = await getAllBankAccounts();

    return successResponse({ bankAccounts });
  } catch (error) {
    console.error("List bank accounts error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    if (session.role !== "ADMIN") {
      return errorResponse(t("api.forbidden"), "FORBIDDEN", 403);
    }

    const body = await request.json();
    const parsed = await parseWithLocale(bankAccountSchema, body, request);
    if (!parsed.success) return parsed.response;

    const {
      bankName,
      bankCode,
      accountNumber,
      accountName,
      isActive,
    } = parsed.data;

    const logoUrl = body.logoUrl;
    const displayOrder = body.displayOrder;

    const bankAccount = await createBankAccount({
      bankName,
      bankCode,
      accountNumber,
      accountName,
      logoUrl,
      displayOrder,
      isActive,
    });

    return successResponse(bankAccount, 201);
  } catch (error) {
    console.error("Create bank account error:", error);
    if (error instanceof Error) {
      return errorResponse(error.message, "VALIDATION_ERROR", 400);
    }
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
