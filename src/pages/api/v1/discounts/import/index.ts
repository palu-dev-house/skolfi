import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { applyDiscountToTuitions } from "@/lib/business-logic/discount-processor";
import {
  type DiscountExcelRow,
  validateDiscountData,
} from "@/lib/excel-templates/discount-template";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const applyImmediately = formData.get("applyImmediately") === "true";

    if (!file) {
      return errorResponse(t("api.fileRequired"), "VALIDATION_ERROR", 400);
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<DiscountExcelRow>(firstSheet);

    if (data.length === 0) {
      return errorResponse(t("api.excelEmpty"), "VALIDATION_ERROR", 400);
    }

    // Get valid academic years and classes for validation
    const academicYears = await prisma.academicYear.findMany({
      select: { id: true, year: true },
    });

    const classes = await prisma.classAcademic.findMany({
      select: { id: true, className: true, academicYearId: true },
    });

    const validAcademicYears = academicYears.map((ay) => ay.year);
    const validClassNames = classes.map((c) => c.className);
    const yearToId = new Map(academicYears.map((ay) => [ay.year, ay.id]));
    const classNameToData = new Map(
      classes.map((c) => [
        c.className,
        { id: c.id, academicYearId: c.academicYearId },
      ]),
    );

    // Validate data
    const { valid, errors } = validateDiscountData(
      data,
      validAcademicYears,
      validClassNames,
    );

    if (valid.length === 0) {
      return successResponse({
        imported: 0,
        skipped: 0,
        tuitionsAffected: 0,
        errors,
      });
    }

    // Process discounts
    let imported = 0;
    let skipped = 0;
    let totalTuitionsAffected = 0;
    const importErrors: Array<{ row: number; error: string }> = [];

    for (const row of valid) {
      try {
        const academicYearId = yearToId.get(row.academicYear);
        if (!academicYearId) {
          importErrors.push({
            row: valid.indexOf(row) + 2,
            error: `Academic Year "${row.academicYear}" not found`,
          });
          continue;
        }

        // Get class ID if specified
        let classAcademicId: string | null = null;
        if (row.className) {
          const classData = classNameToData.get(row.className);
          if (!classData) {
            importErrors.push({
              row: valid.indexOf(row) + 2,
              error: `Class "${row.className}" not found`,
            });
            continue;
          }
          // Verify class belongs to the academic year
          if (classData.academicYearId !== academicYearId) {
            importErrors.push({
              row: valid.indexOf(row) + 2,
              error: `Class "${row.className}" does not belong to academic year "${row.academicYear}"`,
            });
            continue;
          }
          classAcademicId = classData.id;
        }

        // Check for duplicate (same name, academic year, class, and periods)
        const existingDiscount = await prisma.discount.findFirst({
          where: {
            name: row.name,
            academicYearId,
            classAcademicId,
          },
        });

        if (existingDiscount) {
          skipped++;
          continue;
        }

        // Create discount
        const discount = await prisma.discount.create({
          data: {
            name: row.name,
            description: row.description,
            reason: row.reason,
            discountAmount: row.discountAmount,
            targetPeriods: row.targetPeriods,
            academicYearId,
            classAcademicId,
            isActive: true,
          },
        });

        // Apply immediately to existing tuitions if requested
        if (applyImmediately) {
          const applyResult = await applyDiscountToTuitions(
            discount.id,
            prisma,
          );
          totalTuitionsAffected += applyResult.length;
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
      tuitionsAffected: totalTuitionsAffected,
      errors: [...errors, ...importErrors],
    });
  } catch (error) {
    console.error("Import discounts error:", error);
    return errorResponse(
      t("api.importFailed", { resource: "discounts" }),
      "SERVER_ERROR",
      500,
    );
  }
}

export default createApiHandler({ POST });
