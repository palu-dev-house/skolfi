import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { signToken } from "@/lib/auth";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";

export async function POST(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const body = await request.json();
    const parsed = await parseWithLocale(loginSchema, body, request);
    if (!parsed.success) return parsed.response;

    const { email, password } = parsed.data;

    const employee = await prisma.employee.findUnique({
      where: { email },
    });

    if (!employee) {
      return errorResponse(t("api.invalidCredentials"), "UNAUTHORIZED", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      return errorResponse(t("api.invalidCredentials"), "UNAUTHORIZED", 401);
    }

    const token = await signToken({
      employeeId: employee.employeeId,
      email: employee.email,
      name: employee.name,
      role: employee.role,
    });

    const response = successResponse({ message: t("api.loginSuccess") });

    response.headers.set(
      "Set-Cookie",
      `auth-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${8 * 60 * 60}`,
    );

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
