import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  calculatePeriodDiscount,
  getApplicableDiscounts,
} from "@/lib/business-logic/discount-processor";
import { generateTuitions } from "@/lib/business-logic/tuition-generator";
import {
  type TuitionExcelRow,
  validateTuitionData,
} from "@/lib/excel-templates/tuition-template";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return errorResponse(t("api.fileRequired"), "VALIDATION_ERROR", 400);
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<TuitionExcelRow>(firstSheet);

    if (data.length === 0) {
      return errorResponse(t("api.excelEmpty"), "VALIDATION_ERROR", 400);
    }

    const classes = await prisma.classAcademic.findMany({
      include: { academicYear: true },
    });
    const classMap = new Map(classes.map((c) => [c.className, c.id]));

    const { valid, errors } = validateTuitionData(data, classMap);

    if (valid.length === 0) {
      return successResponse({ generated: 0, skipped: 0, errors });
    }

    let totalGenerated = 0;
    let totalSkipped = 0;
    const importErrors: Array<{ row: number; error: string }> = [];

    for (const row of valid) {
      try {
        const classAcademic = classes.find((c) => c.id === row.classAcademicId);
        if (!classAcademic) continue;

        // Get students enrolled in this class
        const studentClasses = await prisma.studentClass.findMany({
          where: { classAcademicId: row.classAcademicId },
          include: {
            student: {
              select: { nis: true, startJoinDate: true, exitedAt: true },
            },
          },
        });
        const students = studentClasses.map((sc) => sc.student);

        if (students.length === 0) {
          totalSkipped++;
          continue;
        }

        // Generate tuition records (MONTHLY)
        const tuitionsToCreate = generateTuitions({
          classAcademicId: row.classAcademicId,
          frequency: "MONTHLY",
          feeAmount: row.feeAmount,
          students: students.map((s) => ({
            nis: s.nis,
            startJoinDate: s.startJoinDate,
            exitedAt: s.exitedAt,
          })),
          academicYear: {
            startDate: classAcademic.academicYear.startDate,
            endDate: classAcademic.academicYear.endDate,
          },
        });

        // Check for existing tuitions
        const existingTuitions = await prisma.tuition.findMany({
          where: {
            classAcademicId: row.classAcademicId,
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

        // Fetch applicable discounts
        const applicableDiscounts = await getApplicableDiscounts(
          row.classAcademicId,
          classAcademic.academicYearId,
          prisma,
        );

        if (newTuitions.length > 0) {
          await prisma.tuition.createMany({
            data: newTuitions.map((t) => {
              const { discountAmount, discountId } = calculatePeriodDiscount(
                t.period,
                applicableDiscounts,
                row.classAcademicId,
              );

              return {
                classAcademicId: t.classAcademicId,
                studentNis: t.studentNis,
                period: t.period,
                month: t.month,
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

        totalGenerated += newTuitions.length;
        totalSkipped += tuitionsToCreate.length - newTuitions.length;
      } catch (error) {
        importErrors.push({
          row: valid.indexOf(row) + 2,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return successResponse({
      generated: totalGenerated,
      skipped: totalSkipped,
      errors: [...errors, ...importErrors],
    });
  } catch (error) {
    console.error("Import tuitions error:", error);
    return errorResponse(
      t("api.importFailed", { resource: "tuitions" }),
      "SERVER_ERROR",
      500,
    );
  }
}

export default createApiHandler({ POST });
