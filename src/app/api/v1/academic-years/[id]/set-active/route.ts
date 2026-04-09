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

  const existing = await prisma.academicYear.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse(t("api.notFound", { resource: "Academic year" }), "NOT_FOUND", 404);
  }

  // Deactivate all, then activate the selected one
  await prisma.$transaction([
    prisma.academicYear.updateMany({
      data: { isActive: false },
    }),
    prisma.academicYear.update({
      where: { id },
      data: { isActive: true },
    }),
  ]);

  const updated = await prisma.academicYear.findUnique({ where: { id } });

  return successResponse(updated);
}
