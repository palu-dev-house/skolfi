import type { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { discountSchema } from "@/lib/validations";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";

async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");
  const academicYearId = searchParams.get("academicYearId") || undefined;
  const classAcademicId = searchParams.get("classAcademicId") || undefined;
  const isActive = searchParams.get("isActive");

  const where: Prisma.DiscountWhereInput = {};

  if (academicYearId) {
    where.academicYearId = academicYearId;
  }

  if (classAcademicId) {
    where.classAcademicId = classAcademicId;
  } else if (classAcademicId === "null") {
    // Filter for school-wide discounts only
    where.classAcademicId = null;
  }

  if (isActive !== null && isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true";
  }

  const [discounts, total] = await Promise.all([
    prisma.discount.findMany({
      where,
      include: {
        academicYear: {
          select: { id: true, year: true },
        },
        classAcademic: {
          select: {
            id: true,
            className: true,
            grade: true,
            section: true,
          },
        },
        _count: {
          select: { tuitions: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.discount.count({ where }),
  ]);

  return successResponse({
    discounts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const body = await request.json();
    const parsed = await parseWithLocale(discountSchema, body, request);
    if (!parsed.success) return parsed.response;

    const {
      name,
      description,
      reason,
      discountAmount,
      targetPeriods,
      academicYearId,
      classAcademicId,
    } = parsed.data;

    // Check if academic year exists
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });

    if (!academicYear) {
      return errorResponse(
        t("api.notFound", { resource: "Academic year" }),
        "NOT_FOUND",
        404,
      );
    }

    // Check if class exists (if provided)
    if (classAcademicId) {
      const classAcademic = await prisma.classAcademic.findUnique({
        where: { id: classAcademicId },
      });

      if (!classAcademic) {
        return errorResponse(
          t("api.notFound", { resource: "Class" }),
          "NOT_FOUND",
          404,
        );
      }

      // Verify class belongs to the academic year
      if (classAcademic.academicYearId !== academicYearId) {
        return errorResponse(t("api.classNotInYear"), "VALIDATION_ERROR", 400);
      }
    }

    // Create discount
    const discount = await prisma.discount.create({
      data: {
        name,
        description: description || null,
        reason: reason || null,
        discountAmount,
        targetPeriods,
        academicYearId,
        classAcademicId: classAcademicId || null,
        isActive: true,
      },
      include: {
        academicYear: {
          select: { id: true, year: true },
        },
        classAcademic: {
          select: {
            id: true,
            className: true,
            grade: true,
            section: true,
          },
        },
      },
    });

    return successResponse({ discount }, 201);
  } catch (error) {
    console.error("Create discount error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET, POST });
