import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth } from "@/lib/api-auth";
import { generateStudentClassTemplate } from "@/lib/excel-templates/student-class-template";
import { prisma } from "@/lib/prisma";

async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const academicYearId = searchParams.get("academicYearId") || undefined;

  // Get students
  const students = await prisma.student.findMany({
    select: { nis: true, name: true },
    orderBy: { name: "asc" },
  });

  // Get classes (optionally filtered by academic year)
  const classWhere: Record<string, unknown> = {};
  if (academicYearId) {
    classWhere.academicYearId = academicYearId;
  } else {
    // Default to active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });
    if (activeYear) {
      classWhere.academicYearId = activeYear.id;
    }
  }

  const classes = await prisma.classAcademic.findMany({
    where: classWhere,
    select: { id: true, className: true },
    orderBy: [{ grade: "asc" }, { section: "asc" }],
  });

  const workbook = generateStudentClassTemplate(students, classes);
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="student-class-assignment-template.xlsx"',
    },
  });
}

export default createApiHandler({ GET });
