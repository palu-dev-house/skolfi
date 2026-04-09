import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { id } = await params;

  const existing = await prisma.employee.findUnique({
    where: { employeeId: id },
  });

  if (!existing) {
    return errorResponse(t("api.notFound", { resource: "Employee" }), "NOT_FOUND", 404);
  }

  const hashedPassword = await bcrypt.hash("123456", 10);

  await prisma.employee.update({
    where: { employeeId: id },
    data: { password: hashedPassword },
  });

  return successResponse({ message: t("api.passwordResetSuccess") });
}
