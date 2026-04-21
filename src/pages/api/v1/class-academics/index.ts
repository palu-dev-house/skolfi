import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { generateClassName } from "@/lib/business-logic/class-name-generator";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { classAcademicSchema } from "@/lib/validations";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";

async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");
  const academicYearId = searchParams.get("academicYearId") || undefined;
  const grade = searchParams.get("grade")
    ? Number(searchParams.get("grade"))
    : undefined;
  const search = searchParams.get("search") || undefined;

  const where: Record<string, unknown> = {};

  if (academicYearId) {
    where.academicYearId = academicYearId;
  }

  if (grade) {
    where.grade = grade;
  }

  if (search) {
    where.className = { contains: search, mode: "insensitive" };
  }

  const [classes, total] = await Promise.all([
    prisma.classAcademic.findMany({
      where,
      include: {
        academicYear: {
          select: { year: true, isActive: true },
        },
        _count: {
          select: { tuitions: true, scholarships: true, studentClasses: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        { academicYear: { year: "desc" } },
        { grade: "asc" },
        { section: "asc" },
      ],
    }),
    prisma.classAcademic.count({ where }),
  ]);

  return successResponse({
    classes,
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
    const parsed = await parseWithLocale(classAcademicSchema, body, request);
    if (!parsed.success) return parsed.response;

    const {
      academicYearId,
      schoolLevel,
      grade,
      section,
      paymentFrequency = "MONTHLY",
    } = parsed.data;

    const monthlyFee = body.monthlyFee;
    const quarterlyFee = body.quarterlyFee;
    const semesterFee = body.semesterFee;

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

    const existing = await prisma.classAcademic.findUnique({
      where: {
        academicYearId_schoolLevel_grade_section: {
          academicYearId,
          schoolLevel,
          grade,
          section,
        },
      },
    });

    if (existing) {
      return errorResponse(t("api.classAlreadyExists"), "DUPLICATE_ENTRY", 409);
    }

    const className = generateClassName(
      grade,
      section,
      academicYear.year,
      schoolLevel,
    );

    // Calculate default fees if not provided
    const calculatedQuarterlyFee =
      quarterlyFee ?? (monthlyFee ? monthlyFee * 3 : null);
    const calculatedSemesterFee =
      semesterFee ?? (monthlyFee ? monthlyFee * 6 : null);

    const classAcademic = await prisma.classAcademic.create({
      data: {
        academicYearId,
        schoolLevel,
        grade,
        section,
        className,
        paymentFrequency,
        monthlyFee: monthlyFee ?? null,
        quarterlyFee: calculatedQuarterlyFee,
        semesterFee: calculatedSemesterFee,
      },
      include: {
        academicYear: { select: { year: true } },
      },
    });

    return successResponse(classAcademic, 201);
  } catch (error) {
    console.error("Create class error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET, POST });
