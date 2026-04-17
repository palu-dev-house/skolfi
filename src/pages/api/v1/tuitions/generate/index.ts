import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  calculatePeriodDiscount,
  getApplicableDiscounts,
} from "@/lib/business-logic/discount-processor";
import {
  generateTuitions,
  getRecordCountForFrequency,
} from "@/lib/business-logic/tuition-generator";
import { getServerT } from "@/lib/i18n-server";
import {
  generateIdempotencyKey,
  withIdempotency,
} from "@/lib/middleware/idempotency";
import { prisma } from "@/lib/prisma";

async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const body = await request.json();
    const {
      classAcademicId,
      feeAmount,
      paymentFrequency = "MONTHLY",
      periodDiscounts,
      studentIdList,
    } = body;

    if (!classAcademicId) {
      return errorResponse(t("api.requiredFields"), "VALIDATION_ERROR", 400);
    }

    if (!feeAmount || feeAmount <= 0) {
      return errorResponse(
        t("api.mustBePositive", { field: "Fee amount" }),
        "VALIDATION_ERROR",
        400,
      );
    }

    // Get class with academic year
    const classAcademic = await prisma.classAcademic.findUnique({
      where: { id: classAcademicId },
      include: {
        academicYear: true,
      },
    });

    if (!classAcademic) {
      return errorResponse(
        t("api.notFound", { resource: "Class" }),
        "NOT_FOUND",
        404,
      );
    }

    // Get students - either specified ones or all students in the class
    let students;
    if (studentIdList && studentIdList.length > 0) {
      students = await prisma.student.findMany({
        where: { id: { in: studentIdList } },
        select: { id: true, startJoinDate: true, exitedAt: true },
      });
    } else {
      // Get students enrolled in this class
      const studentClasses = await prisma.studentClass.findMany({
        where: { classAcademicId },
        include: {
          student: {
            select: { id: true, startJoinDate: true, exitedAt: true },
          },
        },
      });
      students = studentClasses.map((sc) => sc.student);

      // Fallback: if no student classes, get all students
      if (students.length === 0) {
        students = await prisma.student.findMany({
          select: { id: true, startJoinDate: true, exitedAt: true },
        });
      }
    }

    if (students.length === 0) {
      return errorResponse(
        t("api.noStudentsForTuition"),
        "VALIDATION_ERROR",
        400,
      );
    }

    const idempotencyKey = generateIdempotencyKey(
      auth.employeeId,
      "generate_tuitions",
      { classAcademicId },
    );
    const { isDuplicate, result } = await withIdempotency(
      idempotencyKey,
      async () => {
        // Generate tuition records using the specified payment frequency
        const tuitionsToCreate = generateTuitions({
          classAcademicId,
          frequency: paymentFrequency,
          feeAmount,
          periodDiscounts,
          students: students.map((s) => ({
            id: s.id,
            startJoinDate: s.startJoinDate,
            exitedAt: s.exitedAt,
          })),
          academicYear: {
            startDate: classAcademic.academicYear.startDate,
            endDate: classAcademic.academicYear.endDate,
          },
        });

        // Check for existing tuitions to avoid duplicates (using period instead of month)
        const existingTuitions = await prisma.tuition.findMany({
          where: {
            classAcademicId,
            studentId: { in: students.map((s) => s.id) },
          },
          select: {
            studentId: true,
            period: true,
            year: true,
          },
        });

        const existingKeys = new Set(
          existingTuitions.map((t) => `${t.studentId}-${t.period}-${t.year}`),
        );

        const newTuitions = tuitionsToCreate.filter(
          (t) => !existingKeys.has(`${t.studentId}-${t.period}-${t.year}`),
        );

        const skippedCount = tuitionsToCreate.length - newTuitions.length;

        // Fetch applicable discounts for this class
        const applicableDiscounts = await getApplicableDiscounts(
          classAcademicId,
          classAcademic.academicYearId,
          prisma,
        );

        // Create new tuitions with discount applied
        if (newTuitions.length > 0) {
          await prisma.tuition.createMany({
            data: newTuitions.map((t) => {
              // Calculate discount for this period
              const { discountAmount, discountId } = calculatePeriodDiscount(
                t.period,
                applicableDiscounts,
                classAcademicId,
              );

              return {
                classAcademicId: t.classAcademicId,
                studentId: t.studentId,
                period: t.period,
                month: t.month, // For backward compatibility with MONTHLY frequency
                year: t.year,
                feeAmount: t.feeAmount,
                dueDate: t.dueDate,
                status: t.status,
                discountAmount,
                discountId,
              };
            }),
          });
        }

        // Calculate statistics
        const studentsWithFullYear = students.filter(
          (s) => s.startJoinDate <= classAcademic.academicYear.startDate,
        ).length;
        const studentsWithPartialYear = students.length - studentsWithFullYear;
        const recordsPerStudent = getRecordCountForFrequency(paymentFrequency);

        // Calculate discount summary
        const discountsApplied =
          applicableDiscounts.length > 0
            ? applicableDiscounts.map((d) => ({
                id: d.id,
                name: d.name,
                amount: Number(d.discountAmount),
                targetPeriods: d.targetPeriods,
                scope: d.classAcademicId ? "Class-specific" : "School-wide",
              }))
            : [];

        return {
          generated: newTuitions.length,
          skipped: skippedCount,
          details: {
            totalStudents: students.length,
            studentsWithFullYear,
            studentsWithPartialYear,
            className: classAcademic.className,
            academicYear: classAcademic.academicYear.year,
            paymentFrequency,
            feeAmount,
            recordsPerStudent,
            discountsApplied,
          },
        };
      },
    );

    if (isDuplicate) {
      return successResponse({ ...result, _idempotent: true });
    }
    return successResponse(result);
  } catch (error) {
    console.error("Generate tuitions error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ POST });
