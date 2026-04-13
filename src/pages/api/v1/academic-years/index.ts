import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { academicYearSchema } from "@/lib/validations";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";

async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");
  const isActive = searchParams.get("isActive");

  const where: Record<string, unknown> = {};

  if (isActive !== null && isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true";
  }

  const [academicYears, total] = await Promise.all([
    prisma.academicYear.findMany({
      where,
      include: {
        _count: {
          select: { classAcademics: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { year: "desc" },
    }),
    prisma.academicYear.count({ where }),
  ]);

  return successResponse({
    academicYears,
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
    const parsed = await parseWithLocale(academicYearSchema, body, request);
    if (!parsed.success) return parsed.response;

    const { year, startDate, endDate, isActive } = parsed.data;

    const existing = await prisma.academicYear.findUnique({ where: { year } });
    if (existing) {
      return errorResponse(
        t("api.alreadyExists", { resource: "Academic year" }),
        "DUPLICATE_ENTRY",
        409,
      );
    }

    // If setting as active, deactivate all others
    if (isActive) {
      await prisma.academicYear.updateMany({
        data: { isActive: false },
      });
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        year,
        startDate,
        endDate,
        isActive: isActive || false,
      },
    });

    return successResponse(academicYear, 201);
  } catch (error) {
    console.error("Create academic year error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET, POST });
