import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { generateClassName } from "@/lib/business-logic/class-name-generator";
import { readExcelBuffer } from "@/lib/excel-utils";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { SCHOOL_LEVEL_GRADE_RANGE } from "@/lib/validations/schemas/class.schema";

interface ClassRow {
  "Academic Year": string;
  "School Level"?: string;
  Grade: string;
  Section: string;
}

type SchoolLevel = keyof typeof SCHOOL_LEVEL_GRADE_RANGE;

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
    const { data, errors: readErrors } = readExcelBuffer<ClassRow>(buffer);

    if (readErrors.length > 0) {
      return errorResponse(readErrors.join(", "), "VALIDATION_ERROR", 400);
    }

    let imported = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

      if (!row["Academic Year"] || !row.Grade || !row.Section) {
        errors.push({ row: rowNum, error: t("api.missingRequiredFields") });
        continue;
      }

      const grade = Number.parseInt(row.Grade, 10);
      if (Number.isNaN(grade) || grade < 1 || grade > 12) {
        errors.push({ row: rowNum, error: t("api.gradeRange") });
        continue;
      }

      const rawLevel = (row["School Level"] || "").trim().toUpperCase();
      const schoolLevel: SchoolLevel = (
        ["TK", "SD", "SMP", "SMA"].includes(rawLevel)
          ? rawLevel
          : grade >= 10
            ? "SMA"
            : grade >= 7
              ? "SMP"
              : "SD"
      ) as SchoolLevel;

      const range = SCHOOL_LEVEL_GRADE_RANGE[schoolLevel];
      if (grade < range.min || grade > range.max) {
        errors.push({
          row: rowNum,
          error: `Grade ${grade} is outside ${schoolLevel} range (${range.min}-${range.max})`,
        });
        continue;
      }

      try {
        const academicYear = await prisma.academicYear.findUnique({
          where: { year: row["Academic Year"] },
        });

        if (!academicYear) {
          errors.push({
            row: rowNum,
            error: `Academic year "${row["Academic Year"]}" not found`,
          });
          continue;
        }

        const existing = await prisma.classAcademic.findUnique({
          where: {
            academicYearId_schoolLevel_grade_section: {
              academicYearId: academicYear.id,
              schoolLevel,
              grade,
              section: row.Section,
            },
          },
        });

        if (existing) {
          errors.push({
            row: rowNum,
            error: `Class already exists: ${existing.className}`,
          });
          continue;
        }

        const className = generateClassName(
          grade,
          row.Section,
          academicYear.year,
          schoolLevel,
        );

        await prisma.classAcademic.create({
          data: {
            academicYearId: academicYear.id,
            schoolLevel,
            grade,
            section: row.Section,
            className,
          },
        });

        imported++;
      } catch (err) {
        errors.push({
          row: rowNum,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return successResponse({ imported, errors });
  } catch (error) {
    console.error("Import classes error:", error);
    return errorResponse(
      t("api.importFailed", { resource: "classes" }),
      "SERVER_ERROR",
      500,
    );
  }
}

export default createApiHandler({ POST });
