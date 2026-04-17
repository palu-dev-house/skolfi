import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { parseStudentClassImport } from "@/lib/excel-templates/student-class-template";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return errorResponse(t("api.fileRequired"), "VALIDATION_ERROR", 400);
  }

  const buffer = await file.arrayBuffer();
  const { rows, errors: parseErrors } = parseStudentClassImport(buffer);

  if (rows.length === 0) {
    return errorResponse(
      parseErrors.length > 0
        ? `Parse errors: ${parseErrors.join("; ")}`
        : t("api.noValidData"),
      "VALIDATION_ERROR",
      400,
    );
  }

  // Get all students for validation
  const studentIdList = [...new Set(rows.map((r) => r.studentId))];
  const students = await prisma.student.findMany({
    where: { nis: { in: studentIdList } },
    select: { nis: true },
  });
  const validStudentNis = new Set(students.map((s) => s.nis));

  // Get all classes for validation
  const classNames = [...new Set(rows.map((r) => r.className))];
  const classes = await prisma.classAcademic.findMany({
    where: { className: { in: classNames } },
    select: { id: true, className: true },
  });
  const classNameToId = new Map(classes.map((c) => [c.className, c.id]));

  // Process rows
  const errors: Array<{ row: number; nis: string; error: string }> = [];
  const toCreate: Array<{ studentId: string; classAcademicId: string }> = [];

  for (const row of rows) {
    if (!validStudentNis.has(row.studentId)) {
      errors.push({
        row: row.rowNumber,
        nis: row.studentId,
        error: `Student with NIS ${row.studentId} not found`,
      });
      continue;
    }

    const classId = classNameToId.get(row.className);
    if (!classId) {
      errors.push({
        row: row.rowNumber,
        nis: row.studentId,
        error: `Class "${row.className}" not found`,
      });
      continue;
    }

    toCreate.push({
      studentId: row.studentId,
      classAcademicId: classId,
    });
  }

  // Check for duplicates in the database
  const existingAssignments = await prisma.studentClass.findMany({
    where: {
      OR: toCreate.map((tc) => ({
        studentId: tc.studentId,
        classAcademicId: tc.classAcademicId,
      })),
    },
    select: { studentId: true, classAcademicId: true },
  });

  const existingSet = new Set(
    existingAssignments.map((ea) => `${ea.studentId}-${ea.classAcademicId}`),
  );

  const newAssignments = toCreate.filter(
    (tc) => !existingSet.has(`${tc.studentId}-${tc.classAcademicId}`),
  );

  const skipped = toCreate.length - newAssignments.length;

  // Create new assignments
  let created = 0;
  if (newAssignments.length > 0) {
    const result = await prisma.studentClass.createMany({
      data: newAssignments,
      skipDuplicates: true,
    });
    created = result.count;
  }

  return successResponse({
    imported: created,
    skipped,
    errors: [
      ...parseErrors.map((e) => ({ row: 0, nis: "", error: e })),
      ...errors,
    ],
    total: rows.length,
  });
}

export default createApiHandler({ POST });
