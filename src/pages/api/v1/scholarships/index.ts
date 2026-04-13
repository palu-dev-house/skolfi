import type { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  applyScholarship,
  getClassFeeAmount,
} from "@/lib/business-logic/scholarship-processor";
import { getServerT } from "@/lib/i18n-server";
import {
  generateIdempotencyKey,
  withIdempotency,
} from "@/lib/middleware/idempotency";
import { prisma } from "@/lib/prisma";
import { scholarshipSchema } from "@/lib/validations";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";

async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");
  const classAcademicId = searchParams.get("classAcademicId") || undefined;
  const studentNis = searchParams.get("studentNis") || undefined;
  const isFullScholarship = searchParams.get("isFullScholarship");

  const where: Prisma.ScholarshipWhereInput = {};

  if (classAcademicId) {
    where.classAcademicId = classAcademicId;
  }

  if (studentNis) {
    where.studentNis = studentNis;
  }

  if (
    isFullScholarship !== null &&
    isFullScholarship !== undefined &&
    isFullScholarship !== ""
  ) {
    where.isFullScholarship = isFullScholarship === "true";
  }

  const [scholarships, total] = await Promise.all([
    prisma.scholarship.findMany({
      where,
      include: {
        student: {
          select: { nis: true, name: true, parentPhone: true },
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
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.scholarship.count({ where }),
  ]);

  return successResponse({
    scholarships,
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
    const parsed = await parseWithLocale(scholarshipSchema, body, request);
    if (!parsed.success) return parsed.response;

    const { studentNis, classAcademicId, nominal } = parsed.data;
    const name = body.name;

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { nis: studentNis },
    });

    if (!student) {
      return errorResponse(
        t("api.notFound", { resource: "Student" }),
        "NOT_FOUND",
        404,
      );
    }

    // Check if class exists
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

    const idempotencyKey = generateIdempotencyKey(
      auth.employeeId,
      "create_scholarship",
      { studentNis, classAcademicId, nominal },
    );
    const { isDuplicate, result } = await withIdempotency(
      idempotencyKey,
      async () => {
        // Get fee amount from existing tuitions
        const feeAmount = await getClassFeeAmount(classAcademicId, prisma);

        // Get existing scholarships for this student+class to calculate total
        const existingScholarships = await prisma.scholarship.findMany({
          where: { studentNis, classAcademicId },
        });
        const existingTotal = existingScholarships.reduce(
          (sum, s) => sum + Number(s.nominal),
          0,
        );
        const newTotal = existingTotal + nominal;

        // Determine if this makes it a full scholarship (total >= fee)
        // Only mark as full if we know the actual fee and scholarship covers it
        const isFullScholarship = feeAmount ? newTotal >= feeAmount : false;

        // Create scholarship
        const scholarship = await prisma.scholarship.create({
          data: {
            studentNis,
            classAcademicId,
            name: name || "Scholarship",
            nominal,
            isFullScholarship,
          },
          include: {
            student: { select: { nis: true, name: true } },
            classAcademic: { select: { className: true } },
          },
        });

        // Apply scholarship (auto-pay tuitions if total scholarships cover the fee)
        let applicationResult = null;
        if (isFullScholarship && feeAmount) {
          // Get admin employee for system payment
          const adminEmployee = await prisma.employee.findFirst({
            where: { role: "ADMIN" },
          });

          if (adminEmployee) {
            applicationResult = await applyScholarship(
              {
                studentNis,
                classAcademicId,
                nominal: newTotal, // Use total scholarship amount
                monthlyFee: feeAmount,
              },
              prisma,
              adminEmployee.employeeId,
            );
          }
        }

        return { scholarship, applicationResult };
      },
    );

    if (isDuplicate) {
      return successResponse({ ...result, _idempotent: true });
    }
    return successResponse(result, 201);
  } catch (error) {
    console.error("Create scholarship error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET, POST });
