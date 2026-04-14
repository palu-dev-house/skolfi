import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  recordStudentExit,
  StudentExitError,
  undoStudentExit,
} from "@/lib/business-logic/student-exit";
import { getServerT } from "@/lib/i18n-server";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";
import { studentExitSchema } from "@/lib/validations/schemas/student-exit.schema";

function mapErrorStatus(code: StudentExitError["code"]): number {
  return code === "NOT_FOUND" ? 404 : 400;
}

async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nis: string }> },
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { nis } = await params;

  try {
    const body = await request.json();
    const parsed = await parseWithLocale(studentExitSchema, body, request);
    if (!parsed.success) return parsed.response;

    const result = await recordStudentExit({
      nis,
      exitDate: parsed.data.exitDate,
      reason: parsed.data.reason,
      employeeId: auth.employeeId,
    });

    return successResponse(result);
  } catch (error) {
    if (error instanceof StudentExitError) {
      return errorResponse(
        error.message,
        error.code,
        mapErrorStatus(error.code),
      );
    }
    console.error("Record student exit error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ nis: string }> },
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { nis } = await params;

  try {
    const result = await undoStudentExit({ nis, employeeId: auth.employeeId });
    return successResponse(result);
  } catch (error) {
    if (error instanceof StudentExitError) {
      return errorResponse(
        error.message,
        error.code,
        mapErrorStatus(error.code),
      );
    }
    console.error("Undo student exit error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ POST, DELETE });
