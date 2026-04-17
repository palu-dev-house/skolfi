import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth } from "@/lib/api-auth";
import { successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

// GET - Get students not assigned to a specific class or any class in an academic year
async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const classAcademicId = searchParams.get("classAcademicId") || undefined;
  const academicYearId = searchParams.get("academicYearId") || undefined;
  const search = searchParams.get("search") || undefined;
  const limit = Number(searchParams.get("limit")) || 50;

  // Get students already assigned to this class or any class in the academic year
  let assignedStudentIds: string[] = [];

  if (classAcademicId) {
    // Get students already in this specific class
    const assigned = await prisma.studentClass.findMany({
      where: { classAcademicId },
      select: { studentId: true },
    });
    assignedStudentIds = assigned.map((a) => a.studentId);
  } else if (academicYearId) {
    // Get students already in any class for this academic year
    const assigned = await prisma.studentClass.findMany({
      where: {
        classAcademic: { academicYearId },
      },
      select: { studentId: true },
    });
    assignedStudentIds = assigned.map((a) => a.studentId);
  }

  // Build query for unassigned students
  const where: Record<string, unknown> = {};

  if (assignedStudentIds.length > 0) {
    where.id = { notIn: assignedStudentIds };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { nis: { contains: search, mode: "insensitive" } },
    ];
  }

  const students = await prisma.student.findMany({
    where,
    select: {
      nis: true,
      name: true,
      parentName: true,
      parentPhone: true,
      startJoinDate: true,
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  return successResponse({
    students,
    total: students.length,
  });
}

export default createApiHandler({ GET });
