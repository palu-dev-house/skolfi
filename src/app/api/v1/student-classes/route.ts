import type { NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { studentClassAssignSchema, studentClassRemoveSchema } from "@/lib/validations";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";

// GET - List student-class assignments with filters
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 10;
  const classAcademicId = searchParams.get("classAcademicId") || undefined;
  const studentNis = searchParams.get("studentNis") || undefined;
  const academicYearId = searchParams.get("academicYearId") || undefined;
  const search = searchParams.get("search") || undefined;

  const where: Record<string, unknown> = {};

  if (classAcademicId) {
    where.classAcademicId = classAcademicId;
  }

  if (studentNis) {
    where.studentNis = studentNis;
  }

  if (academicYearId) {
    where.classAcademic = { academicYearId };
  }

  if (search) {
    where.student = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { nis: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [studentClasses, total] = await Promise.all([
    prisma.studentClass.findMany({
      where,
      include: {
        student: {
          select: {
            nis: true,
            name: true,
            parentName: true,
            parentPhone: true,
            startJoinDate: true,
          },
        },
        classAcademic: {
          select: {
            id: true,
            className: true,
            grade: true,
            section: true,
            academicYear: {
              select: {
                year: true,
              },
            },
          },
        },
      },
      orderBy: [
        { classAcademic: { grade: "asc" } },
        { classAcademic: { section: "asc" } },
        { student: { name: "asc" } },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.studentClass.count({ where }),
  ]);

  return successResponse({
    studentClasses,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// POST - Assign student(s) to a class
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);

  const body = await request.json();
  const parsed = await parseWithLocale(studentClassAssignSchema, body, request);
  if (!parsed.success) return parsed.response;

  const { classAcademicId, studentNisList } = parsed.data;

  // Verify class exists
  const classAcademic = await prisma.classAcademic.findUnique({
    where: { id: classAcademicId },
  });

  if (!classAcademic) {
    return errorResponse(t("api.notFound", { resource: "Class" }), "NOT_FOUND", 404);
  }

  // Verify all students exist
  const students = await prisma.student.findMany({
    where: { nis: { in: studentNisList } },
    select: { nis: true },
  });

  const existingNis = new Set(students.map((s) => s.nis));
  const missingNis = studentNisList.filter(
    (nis: string) => !existingNis.has(nis),
  );

  if (missingNis.length > 0) {
    return errorResponse(
      `Students not found: ${missingNis.join(", ")}`,
      "NOT_FOUND",
      404,
    );
  }

  // Check for existing assignments
  const existingAssignments = await prisma.studentClass.findMany({
    where: {
      classAcademicId,
      studentNis: { in: studentNisList },
    },
    select: { studentNis: true },
  });

  const alreadyAssigned = new Set(existingAssignments.map((a) => a.studentNis));
  const toAssign = studentNisList.filter(
    (nis: string) => !alreadyAssigned.has(nis),
  );

  if (toAssign.length === 0) {
    return errorResponse(
      t("api.allStudentsAssigned"),
      "DUPLICATE_ENTRY",
      409,
    );
  }

  // Create assignments
  const created = await prisma.studentClass.createMany({
    data: toAssign.map((studentNis: string) => ({
      studentNis,
      classAcademicId,
    })),
  });

  return successResponse(
    {
      assigned: created.count,
      skipped: alreadyAssigned.size,
      skippedNis: Array.from(alreadyAssigned),
    },
    201,
  );
}

// DELETE - Remove multiple student-class assignments
export async function DELETE(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const parsed = await parseWithLocale(studentClassRemoveSchema, body, request);
  if (!parsed.success) return parsed.response;

  const { classAcademicId, studentNisList } = parsed.data;

  const deleted = await prisma.studentClass.deleteMany({
    where: {
      classAcademicId,
      studentNis: { in: studentNisList },
    },
  });

  return successResponse({ deleted: deleted.count });
}
