import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { errorResponse, successResponse } from "@/lib/api-response";
import { censorIdentityNumber, censorName, censorPhone } from "@/lib/censor";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/v1/student-portal/[nis]
 * Public endpoint for students to view their payment status
 */
async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ nis: string }> },
) {
  const { nis } = await params;

  // Get student
  const student = await prisma.student.findUnique({
    where: { nis },
    select: {
      nis: true,
      name: true,
      parentName: true,
      parentPhone: true,
      nik: true,
    },
  });
  if (student?.parentName) {
    student.parentName = censorName(student?.parentName);
  }

  if (student?.parentPhone) {
    student.parentPhone = censorPhone(student?.parentPhone);
  }

  if (student?.nik) {
    student.nik = censorIdentityNumber(student?.nik);
  }

  if (!student) {
    return errorResponse("Student not found", "NOT_FOUND", 404);
  }

  // Get all tuitions grouped by academic year
  const tuitions = await prisma.tuition.findMany({
    where: { studentNis: nis },
    include: {
      classAcademic: {
        include: {
          academicYear: true,
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          notes: true,
        },
        orderBy: { paymentDate: "desc" },
      },
      discount: {
        select: {
          name: true,
          reason: true,
          description: true,
        },
      },
    },
    orderBy: [
      { classAcademic: { academicYear: { year: "desc" } } },
      { dueDate: "asc" },
      { period: "asc" },
    ],
  });

  // Group by academic year
  const groupedByYear: Record<
    string,
    {
      academicYear: { id: string; year: string };
      class: { id: string; className: string; grade: number; section: string };
      tuitions: Array<{
        id: string;
        period: string;
        year: number;
        feeAmount: number;
        scholarshipAmount: number;
        discountAmount: number;
        paidAmount: number;
        effectiveFee: number;
        remainingAmount: number;
        status: string;
        dueDate: string;
        payments: Array<{
          id: string;
          amount: number;
          paymentDate: string;
          notes: string | null;
        }>;
      }>;
      summary: {
        totalFees: number;
        totalScholarships: number;
        totalDiscounts: number;
        totalEffectiveFees: number;
        totalPaid: number;
        totalOutstanding: number;
        paidCount: number;
        partialCount: number;
        unpaidCount: number;
      };
    }
  > = {};

  for (const tuition of tuitions) {
    const yearKey = tuition.classAcademic.academicYear.id;

    if (!groupedByYear[yearKey]) {
      groupedByYear[yearKey] = {
        academicYear: {
          id: tuition.classAcademic.academicYear.id,
          year: tuition.classAcademic.academicYear.year,
        },
        class: {
          id: tuition.classAcademic.id,
          className: tuition.classAcademic.className,
          grade: tuition.classAcademic.grade,
          section: tuition.classAcademic.section,
        },
        tuitions: [],
        summary: {
          totalFees: 0,
          totalScholarships: 0,
          totalDiscounts: 0,
          totalEffectiveFees: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          paidCount: 0,
          partialCount: 0,
          unpaidCount: 0,
        },
      };
    }

    const feeAmount = Number(tuition.feeAmount);
    const scholarshipAmount = Number(tuition.scholarshipAmount);
    const discountAmount = Number(tuition.discountAmount) || 0;
    const paidAmount = Number(tuition.paidAmount);
    const effectiveFee = Math.max(
      feeAmount - scholarshipAmount - discountAmount,
      0,
    );
    const remainingAmount = Math.max(effectiveFee - paidAmount, 0);

    groupedByYear[yearKey].tuitions.push({
      id: tuition.id,
      period: tuition.period,
      year: tuition.year,
      feeAmount,
      scholarshipAmount,
      discountAmount,
      paidAmount,
      effectiveFee,
      remainingAmount,
      status: tuition.status,
      dueDate: tuition.dueDate.toISOString(),
      payments: tuition.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentDate: p.paymentDate.toISOString(),
        notes: p.notes,
      })),
    });

    // Update summary
    const summary = groupedByYear[yearKey].summary;
    summary.totalFees += feeAmount;
    summary.totalScholarships += scholarshipAmount;
    summary.totalDiscounts += discountAmount;
    summary.totalEffectiveFees += effectiveFee;
    summary.totalPaid += paidAmount;
    summary.totalOutstanding += remainingAmount;

    if (tuition.status === "PAID") summary.paidCount++;
    else if (tuition.status === "PARTIAL") summary.partialCount++;
    else summary.unpaidCount++;
  }

  // Get scholarships
  const scholarships = await prisma.scholarship.findMany({
    where: { studentNis: nis },
    include: {
      classAcademic: {
        include: { academicYear: true },
      },
    },
  });

  return successResponse(
    {
      student,
      academicYears: Object.values(groupedByYear),
      scholarships: scholarships.map((s) => ({
        id: s.id,
        name: s.name,
        nominal: Number(s.nominal),
        isFullScholarship: s.isFullScholarship,
        academicYear: s.classAcademic.academicYear.year,
        className: s.classAcademic.className,
      })),
    },
    200,
    "s-maxage=300, stale-while-revalidate=60",
  );
}

export default createApiHandler({ GET });
