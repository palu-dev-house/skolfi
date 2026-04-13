import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

// GET - Get all students assigned to a specific class
async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> },
) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { classId } = await params;

  const classAcademic = await prisma.classAcademic.findUnique({
    where: { id: classId },
    include: {
      academicYear: { select: { year: true } },
    },
  });

  if (!classAcademic) {
    return errorResponse(
      t("api.notFound", { resource: "Class" }),
      "NOT_FOUND",
      404,
    );
  }

  const studentClasses = await prisma.studentClass.findMany({
    where: { classAcademicId: classId },
    include: {
      student: {
        select: {
          nis: true,
          name: true,
          nik: true,
          parentName: true,
          parentPhone: true,
          startJoinDate: true,
        },
      },
    },
    orderBy: { student: { name: "asc" } },
  });

  return successResponse({
    class: {
      id: classAcademic.id,
      className: classAcademic.className,
      grade: classAcademic.grade,
      section: classAcademic.section,
      academicYear: classAcademic.academicYear.year,
    },
    students: studentClasses.map((sc) => ({
      ...sc.student,
      enrolledAt: sc.enrolledAt,
    })),
    totalStudents: studentClasses.length,
  });
}

export default createApiHandler({ GET });
