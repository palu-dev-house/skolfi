import type { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth } from "@/lib/api-auth";
import { successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");
  const classAcademicId = searchParams.get("classAcademicId") || undefined;
  const studentNis = searchParams.get("studentNis") || undefined;
  const statusParam = searchParams.get("status");
  const status =
    statusParam && statusParam !== "null" ? statusParam : undefined;
  const periodParam = searchParams.get("period");
  const period =
    periodParam && periodParam !== "null" ? periodParam : undefined;
  // Keep month for backward compatibility
  const monthParam = searchParams.get("month");
  const month = monthParam && monthParam !== "null" ? monthParam : undefined;
  const year = searchParams.get("year")
    ? Number(searchParams.get("year"))
    : undefined;
  const dueDateFrom = searchParams.get("dueDateFrom") || undefined;
  const dueDateTo = searchParams.get("dueDateTo") || undefined;

  const where: Prisma.TuitionWhereInput = {};

  if (classAcademicId) {
    where.classAcademicId = classAcademicId;
  }

  if (studentNis) {
    where.studentNis = studentNis;
  }

  if (status) {
    where.status = status as "UNPAID" | "PAID" | "PARTIAL" | "VOID";
  }

  if (period) {
    where.period = period;
  } else if (month) {
    // Backward compatibility: if month is provided, filter by period
    where.period = month;
  }

  if (year) {
    where.year = year;
  }

  if (dueDateFrom || dueDateTo) {
    where.dueDate = {};
    if (dueDateFrom) {
      where.dueDate.gte = new Date(dueDateFrom);
    }
    if (dueDateTo) {
      where.dueDate.lte = new Date(dueDateTo);
    }
  }

  const [tuitions, total] = await Promise.all([
    prisma.tuition.findMany({
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
        discount: {
          select: {
            id: true,
            name: true,
            reason: true,
            discountAmount: true,
          },
        },
        _count: {
          select: { payments: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        { year: "desc" },
        { period: "desc" },
        { student: { name: "asc" } },
      ],
    }),
    prisma.tuition.count({ where }),
  ]);

  // Fetch all scholarships for each tuition's student+class combination
  const tuitionsWithScholarships = await Promise.all(
    tuitions.map(async (tuition) => {
      const scholarships = await prisma.scholarship.findMany({
        where: {
          studentNis: tuition.studentNis,
          classAcademicId: tuition.classAcademicId,
        },
        select: {
          id: true,
          name: true,
          nominal: true,
          isFullScholarship: true,
        },
        orderBy: { createdAt: "asc" },
      });

      // Calculate total scholarship amount
      const totalScholarshipAmount = scholarships.reduce(
        (sum, s) => sum + Number(s.nominal),
        0,
      );
      const feeAmount = Number(tuition.feeAmount);
      // Calculate if total scholarships cover the full fee (not based on DB flag)
      const hasFullScholarship = totalScholarshipAmount >= feeAmount;

      return {
        ...tuition,
        scholarships: scholarships.map((s) => ({
          id: s.id,
          name: s.name,
          nominal: s.nominal.toString(),
          isFullScholarship: s.isFullScholarship,
        })),
        scholarshipSummary:
          scholarships.length > 0
            ? {
                count: scholarships.length,
                totalAmount: totalScholarshipAmount.toString(),
                hasFullScholarship,
              }
            : null,
      };
    }),
  );

  return successResponse({
    tuitions: tuitionsWithScholarships,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export default createApiHandler({ GET });
