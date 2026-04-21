import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { generateClassName } from "@/lib/business-logic/class-name-generator";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { id } = await params;

  const classAcademic = await prisma.classAcademic.findUnique({
    where: { id },
    include: {
      academicYear: { select: { year: true } },
      _count: { select: { tuitions: true, scholarships: true } },
    },
  });

  if (!classAcademic) {
    return errorResponse(
      t("api.notFound", { resource: "Class" }),
      "NOT_FOUND",
      404,
    );
  }

  return successResponse(classAcademic);
}

async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await prisma.classAcademic.findUnique({
      where: { id },
      include: { academicYear: true },
    });

    if (!existing) {
      return errorResponse(
        t("api.notFound", { resource: "Class" }),
        "NOT_FOUND",
        404,
      );
    }

    const grade = body.grade ?? existing.grade;
    const section = body.section ?? existing.section;
    const academicYearId = body.academicYearId ?? existing.academicYearId;
    const schoolLevel = body.schoolLevel ?? existing.schoolLevel;

    let academicYear = existing.academicYear;
    if (
      body.academicYearId &&
      body.academicYearId !== existing.academicYearId
    ) {
      const newYear = await prisma.academicYear.findUnique({
        where: { id: body.academicYearId },
      });
      if (!newYear) {
        return errorResponse(
          t("api.notFound", { resource: "Academic year" }),
          "NOT_FOUND",
          404,
        );
      }
      academicYear = newYear;
    }

    // Check for duplicates if any key field changed
    if (
      grade !== existing.grade ||
      section !== existing.section ||
      academicYearId !== existing.academicYearId ||
      schoolLevel !== existing.schoolLevel
    ) {
      const duplicate = await prisma.classAcademic.findUnique({
        where: {
          academicYearId_schoolLevel_grade_section: {
            academicYearId,
            schoolLevel,
            grade,
            section,
          },
        },
      });
      if (duplicate && duplicate.id !== id) {
        return errorResponse(
          t("api.classAlreadyExists"),
          "DUPLICATE_ENTRY",
          409,
        );
      }
    }

    const className = generateClassName(
      grade,
      section,
      academicYear.year,
      schoolLevel,
    );

    // Handle payment frequency and fee updates
    const paymentFrequency = body.paymentFrequency ?? existing.paymentFrequency;
    const monthlyFee =
      body.monthlyFee !== undefined ? body.monthlyFee : existing.monthlyFee;

    // Calculate default quarterly/semester fees if monthlyFee changed and they weren't explicitly set
    let quarterlyFee = body.quarterlyFee;
    let semesterFee = body.semesterFee;

    if (quarterlyFee === undefined) {
      // If monthlyFee was updated but quarterlyFee wasn't, recalculate
      if (body.monthlyFee !== undefined && monthlyFee) {
        quarterlyFee = monthlyFee * 3;
      } else {
        quarterlyFee = existing.quarterlyFee;
      }
    }

    if (semesterFee === undefined) {
      // If monthlyFee was updated but semesterFee wasn't, recalculate
      if (body.monthlyFee !== undefined && monthlyFee) {
        semesterFee = monthlyFee * 6;
      } else {
        semesterFee = existing.semesterFee;
      }
    }

    const classAcademic = await prisma.classAcademic.update({
      where: { id },
      data: {
        grade,
        section,
        academicYearId,
        schoolLevel,
        className,
        paymentFrequency,
        monthlyFee,
        quarterlyFee,
        semesterFee,
      },
      include: {
        academicYear: { select: { year: true } },
      },
    });

    return successResponse(classAcademic);
  } catch (error) {
    console.error("Update class error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { id } = await params;

  const existing = await prisma.classAcademic.findUnique({
    where: { id },
    include: { _count: { select: { tuitions: true } } },
  });

  if (!existing) {
    return errorResponse(
      t("api.notFound", { resource: "Class" }),
      "NOT_FOUND",
      404,
    );
  }

  if (existing._count.tuitions > 0) {
    return errorResponse(
      t("api.cannotDelete", { resource: "class", dependency: "tuitions" }),
      "VALIDATION_ERROR",
      400,
    );
  }

  await prisma.classAcademic.delete({ where: { id } });

  return successResponse({
    message: t("api.deleteSuccess", { resource: "Class" }),
  });
}

export default createApiHandler({ GET, PUT, DELETE });
