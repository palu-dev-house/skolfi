import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validations";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";

async function POST(request: NextRequest) {
  const t = await getServerT(request);
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const parsed = await parseWithLocale(changePasswordSchema, body, request);
    if (!parsed.success) return parsed.response;

    const { currentPassword, newPassword } = parsed.data;

    // Get the employee
    const employee = await prisma.employee.findUnique({
      where: { employeeId: auth.employeeId },
    });

    if (!employee) {
      return errorResponse(
        t("api.notFound", { resource: "Employee" }),
        "NOT_FOUND",
        404,
      );
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      employee.password,
    );

    if (!isValidPassword) {
      return errorResponse(
        t("api.currentPasswordIncorrect"),
        "INVALID_PASSWORD",
        400,
      );
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.employee.update({
      where: { employeeId: auth.employeeId },
      data: { password: hashedPassword },
    });

    return successResponse({ message: t("api.passwordChanged") });
  } catch (error) {
    console.error("Change password error:", error);
    return errorResponse(t("api.passwordChangeFailed"), "INTERNAL_ERROR", 500);
  }
}

export default createApiHandler({ POST });
