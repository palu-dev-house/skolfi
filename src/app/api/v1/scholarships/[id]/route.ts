import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { id } = await params;

  const scholarship = await prisma.scholarship.findUnique({
    where: { id },
    include: {
      student: {
        select: { nis: true, name: true, parentName: true, parentPhone: true },
      },
      classAcademic: {
        select: {
          className: true,
          grade: true,
          section: true,
          academicYear: { select: { year: true } },
        },
      },
    },
  });

  if (!scholarship) {
    return errorResponse(t("api.notFound", { resource: "Scholarship" }), "NOT_FOUND", 404);
  }

  return successResponse(scholarship);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { id } = await params;

  try {
    const scholarship = await prisma.scholarship.findUnique({
      where: { id },
    });

    if (!scholarship) {
      return errorResponse(t("api.notFound", { resource: "Scholarship" }), "NOT_FOUND", 404);
    }

    // Note: Deleting scholarship does NOT revert auto-paid tuitions
    // This is intentional as per business logic

    await prisma.scholarship.delete({ where: { id } });

    return successResponse({
      message: t("api.deleteSuccess", { resource: "Scholarship" }),
      note: "Auto-paid tuitions were not reverted",
    });
  } catch (error) {
    console.error("Delete scholarship error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
