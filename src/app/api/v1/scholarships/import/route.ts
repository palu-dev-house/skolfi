import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  applyScholarship,
  getClassFeeAmount,
} from "@/lib/business-logic/scholarship-processor";
import {
  type ScholarshipExcelRow,
  validateScholarshipData,
} from "@/lib/excel-templates/scholarship-template";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return errorResponse(t("api.fileRequired"), "VALIDATION_ERROR", 400);
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<ScholarshipExcelRow>(firstSheet);

    if (data.length === 0) {
      return errorResponse(t("api.excelEmpty"), "VALIDATION_ERROR", 400);
    }

    // Get valid students and classes for validation
    const students = await prisma.student.findMany({
      select: { nis: true, name: true },
    });

    const classes = await prisma.classAcademic.findMany({
      select: { id: true, className: true },
    });

    const validStudentNis = students.map((s) => s.nis);
    const validClassNames = classes.map((c) => c.className);
    const classNameToId = new Map(classes.map((c) => [c.className, c.id]));

    // Validate data
    const { valid, errors } = validateScholarshipData(
      data,
      validStudentNis,
      validClassNames,
    );

    if (valid.length === 0) {
      return successResponse({
        imported: 0,
        skipped: 0,
        autoPayments: 0,
        errors,
      });
    }

    // Get admin employee for system payments
    const adminEmployee = await prisma.employee.findFirst({
      where: { role: "ADMIN" },
    });

    if (!adminEmployee) {
      return errorResponse(
        "No admin employee found for system payments",
        "SERVER_ERROR",
        500,
      );
    }

    // Process scholarships
    let imported = 0;
    const skipped = 0;
    let totalAutoPayments = 0;
    const importErrors: Array<{ row: number; error: string }> = [];

    for (const row of valid) {
      try {
        const classAcademicId = classNameToId.get(row.className);
        if (!classAcademicId) {
          importErrors.push({
            row: valid.indexOf(row) + 2,
            error: `Class "${row.className}" not found`,
          });
          continue;
        }

        // Get fee amount for this class
        const feeAmount = await getClassFeeAmount(classAcademicId, prisma);

        // Get existing scholarships for this student+class to calculate total
        const existingScholarships = await prisma.scholarship.findMany({
          where: { studentNis: row.studentNis, classAcademicId },
        });
        const existingTotal = existingScholarships.reduce(
          (sum, s) => sum + Number(s.nominal),
          0,
        );
        const newTotal = existingTotal + row.nominal;
        // Only mark as full if we know the actual fee and scholarship covers it
        const isFullScholarship = feeAmount ? newTotal >= feeAmount : false;

        // Create scholarship (multiple scholarships allowed per student per class)
        await prisma.scholarship.create({
          data: {
            studentNis: row.studentNis,
            classAcademicId,
            name: (row as { name?: string }).name || "Imported Scholarship",
            nominal: row.nominal,
            isFullScholarship,
          },
        });

        // Apply scholarship (auto-pay if total now covers the fee)
        if (isFullScholarship && feeAmount && existingTotal < feeAmount) {
          // Only auto-pay if this scholarship pushed it over the threshold
          const result = await applyScholarship(
            {
              studentNis: row.studentNis,
              classAcademicId,
              nominal: newTotal,
              monthlyFee: feeAmount,
            },
            prisma,
            adminEmployee.employeeId,
          );
          totalAutoPayments += result.tuitionsAffected;
        }

        imported++;
      } catch (error) {
        console.error("Import row error:", error);
        importErrors.push({
          row: valid.indexOf(row) + 2,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return successResponse({
      imported,
      skipped,
      autoPayments: totalAutoPayments,
      errors: [...errors, ...importErrors],
    });
  } catch (error) {
    console.error("Import scholarships error:", error);
    return errorResponse(
      t("api.importFailed", { resource: "scholarships" }),
      "SERVER_ERROR",
      500,
    );
  }
}
