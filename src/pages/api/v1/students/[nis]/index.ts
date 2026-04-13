import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nis: string }> },
) {
  const auth = await requireRole(request, ["ADMIN", "CASHIER"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { nis } = await params;

  const student = await prisma.student.findUnique({ where: { nis } });

  if (!student) {
    return errorResponse(
      t("api.notFound", { resource: "Student" }),
      "NOT_FOUND",
      404,
    );
  }

  return successResponse(student);
}

async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ nis: string }> },
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { nis } = await params;

  try {
    const body = await request.json();
    const existing = await prisma.student.findUnique({ where: { nis } });

    if (!existing) {
      return errorResponse(
        t("api.notFound", { resource: "Student" }),
        "NOT_FOUND",
        404,
      );
    }

    if (body.nik && body.nik !== existing.nik) {
      const nikTaken = await prisma.student.findUnique({
        where: { nik: body.nik },
      });
      if (nikTaken) {
        return errorResponse(
          t("api.alreadyExists", { resource: "NIK" }),
          "DUPLICATE_ENTRY",
          409,
        );
      }
    }

    const student = await prisma.student.update({
      where: { nis },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.nik && { nik: body.nik }),
        ...(body.address && { address: body.address }),
        ...(body.parentName && { parentName: body.parentName }),
        ...(body.parentPhone && { parentPhone: body.parentPhone }),
        ...(body.startJoinDate && {
          startJoinDate: new Date(body.startJoinDate),
        }),
      },
    });

    return successResponse(student);
  } catch (error) {
    console.error("Update student error:", error);
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

  const existing = await prisma.student.findUnique({ where: { nis } });
  if (!existing) {
    return errorResponse(
      t("api.notFound", { resource: "Student" }),
      "NOT_FOUND",
      404,
    );
  }

  await prisma.student.delete({ where: { nis } });

  return successResponse({
    message: t("api.deleteSuccess", { resource: "Student" }),
  });
}

export default createApiHandler({ GET, PUT, DELETE });
