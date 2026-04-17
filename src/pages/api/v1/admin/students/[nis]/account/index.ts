import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth";
import {
  createStudentAccount,
  softDeleteAccount,
} from "@/lib/business-logic/student-account";
import { getServerT } from "@/lib/i18n-server";

// Create account for student
async function POST(
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

    const result = await createStudentAccount({
      studentId: nis,
      createdBy: session.employeeId,
    });

    return successResponse(result, 201);
  } catch (error) {
    console.error("Create student account error:", error);
    if (error instanceof Error) {
      return errorResponse(error.message, "VALIDATION_ERROR", 400);
    }
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

// Soft delete account
async function DELETE(
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
    const body = await request.json().catch(() => ({}));
    const reason = body.reason as string | undefined;

    await softDeleteAccount(nis, session.employeeId, reason);

    return successResponse({
      message: t("api.deleteSuccess", { resource: "Account" }),
    });
  } catch (error) {
    console.error("Delete student account error:", error);
    if (error instanceof Error) {
      return errorResponse(error.message, "VALIDATION_ERROR", 400);
    }
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ POST, DELETE });
