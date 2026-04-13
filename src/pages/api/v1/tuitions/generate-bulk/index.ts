import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  generateTuitions,
  getFeeForFrequency,
} from "@/lib/business-logic/tuition-generator";
import { prisma } from "@/lib/prisma";

interface ClassConfig {
  classAcademicId: string;
  feeAmount?: number; // Optional - uses class config if not provided
  studentNisList?: string[];
}

async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const { classes } = body as { classes: ClassConfig[] };

    if (!classes || !Array.isArray(classes) || classes.length === 0) {
      return errorResponse(
        "At least one class configuration is required",
        "VALIDATION_ERROR",
        400,
      );
    }

    const results: Array<{
      classAcademicId: string;
      className: string;
      generated: number;
      skipped: number;
      paymentFrequency?: string;
      feeAmount?: number;
      error?: string;
    }> = [];

    let totalGenerated = 0;
    let totalSkipped = 0;

    for (const classConfig of classes) {
      const {
        classAcademicId,
        feeAmount: overrideFeeAmount,
        studentNisList,
      } = classConfig;

      if (!classAcademicId) {
        results.push({
          classAcademicId: classAcademicId || "unknown",
          className: "unknown",
          generated: 0,
          skipped: 0,
          error: "Class ID is required",
        });
        continue;
      }

      // Get class with academic year
      const classAcademic = await prisma.classAcademic.findUnique({
        where: { id: classAcademicId },
        include: { academicYear: true },
      });

      if (!classAcademic) {
        results.push({
          classAcademicId,
          className: "unknown",
          generated: 0,
          skipped: 0,
          error: "Class not found",
        });
        continue;
      }

      // Get fee amount from class configuration or override
      const feeAmount = getFeeForFrequency(
        {
          paymentFrequency: classAcademic.paymentFrequency,
          monthlyFee: classAcademic.monthlyFee
            ? Number(classAcademic.monthlyFee)
            : null,
          quarterlyFee: classAcademic.quarterlyFee
            ? Number(classAcademic.quarterlyFee)
            : null,
          semesterFee: classAcademic.semesterFee
            ? Number(classAcademic.semesterFee)
            : null,
        },
        overrideFeeAmount,
      );

      if (!feeAmount || feeAmount <= 0) {
        results.push({
          classAcademicId,
          className: classAcademic.className,
          generated: 0,
          skipped: 0,
          error:
            "Fee amount must be configured on class or provided in request",
        });
        continue;
      }

      // Get students
      let students;
      if (studentNisList && studentNisList.length > 0) {
        students = await prisma.student.findMany({
          where: { nis: { in: studentNisList } },
          select: { nis: true, startJoinDate: true },
        });
      } else {
        // Get students enrolled in this class
        const studentClasses = await prisma.studentClass.findMany({
          where: { classAcademicId },
          include: {
            student: {
              select: { nis: true, startJoinDate: true },
            },
          },
        });
        students = studentClasses.map((sc) => sc.student);

        // Fallback: if no student classes, get all students
        if (students.length === 0) {
          students = await prisma.student.findMany({
            select: { nis: true, startJoinDate: true },
          });
        }
      }

      if (students.length === 0) {
        results.push({
          classAcademicId,
          className: classAcademic.className,
          generated: 0,
          skipped: 0,
          error: "No students found",
        });
        continue;
      }

      // Generate tuitions using class's payment frequency
      const tuitionsToCreate = generateTuitions({
        classAcademicId,
        frequency: classAcademic.paymentFrequency,
        feeAmount,
        students: students.map((s) => ({
          nis: s.nis,
          startJoinDate: s.startJoinDate,
        })),
        academicYear: {
          startDate: classAcademic.academicYear.startDate,
          endDate: classAcademic.academicYear.endDate,
        },
      });

      // Check for existing tuitions (using period instead of month)
      const existingTuitions = await prisma.tuition.findMany({
        where: {
          classAcademicId,
          studentNis: { in: students.map((s) => s.nis) },
        },
        select: { studentNis: true, period: true, year: true },
      });

      const existingKeys = new Set(
        existingTuitions.map((t) => `${t.studentNis}-${t.period}-${t.year}`),
      );

      const newTuitions = tuitionsToCreate.filter(
        (t) => !existingKeys.has(`${t.studentNis}-${t.period}-${t.year}`),
      );

      const skippedCount = tuitionsToCreate.length - newTuitions.length;

      // Create new tuitions
      if (newTuitions.length > 0) {
        await prisma.tuition.createMany({
          data: newTuitions.map((t) => ({
            classAcademicId: t.classAcademicId,
            studentNis: t.studentNis,
            period: t.period,
            month: t.month, // For backward compatibility
            year: t.year,
            feeAmount: t.feeAmount,
            dueDate: t.dueDate,
            status: t.status,
          })),
        });
      }

      results.push({
        classAcademicId,
        className: classAcademic.className,
        generated: newTuitions.length,
        skipped: skippedCount,
        paymentFrequency: classAcademic.paymentFrequency,
        feeAmount,
      });

      totalGenerated += newTuitions.length;
      totalSkipped += skippedCount;
    }

    return successResponse({
      totalGenerated,
      totalSkipped,
      results,
    });
  } catch (error) {
    console.error("Generate bulk tuitions error:", error);
    return errorResponse("Failed to generate tuitions", "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ POST });
