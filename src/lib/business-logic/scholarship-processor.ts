import type { PrismaClient } from "@/generated/prisma/client";

export interface ScholarshipApplicationParams {
  studentId: string;
  classAcademicId: string;
  nominal: number;
  monthlyFee: number;
}

export interface ScholarshipApplicationResult {
  isFullScholarship: boolean;
  tuitionsAffected: number;
  autoPayments: Array<{
    tuitionId: string;
    amount: number;
  }>;
}

/**
 * Apply scholarship to tuitions
 * - For full scholarships: mark UNPAID tuitions as PAID with scholarshipAmount = fee
 * - For partial scholarships: just update scholarshipAmount on UNPAID/PARTIAL tuitions
 * - Does NOT create fake payment records - scholarship is tracked separately
 */
export async function applyScholarship(
  params: ScholarshipApplicationParams,
  prisma: PrismaClient,
  _systemEmployeeId: string, // No longer needed, kept for API compatibility
): Promise<ScholarshipApplicationResult> {
  const { studentId, classAcademicId, nominal, monthlyFee } = params;

  // Determine if full scholarship (covers full monthly fee)
  const isFullScholarship = nominal >= monthlyFee;

  const result: ScholarshipApplicationResult = {
    isFullScholarship,
    tuitionsAffected: 0,
    autoPayments: [],
  };

  // Find all unpaid/partial tuitions for this student in this class
  const tuitions = await prisma.tuition.findMany({
    where: {
      studentId,
      classAcademicId,
      status: { in: ["UNPAID", "PARTIAL"] },
    },
  });

  // Update tuitions with scholarship amount
  for (const tuition of tuitions) {
    const feeAmount = Number(tuition.feeAmount);
    const paidAmount = Number(tuition.paidAmount);
    const discountAmount = Number(tuition.discountAmount);
    const effectiveFee = Math.max(feeAmount - nominal - discountAmount, 0);

    // Determine new status
    let newStatus: "PAID" | "PARTIAL" | "UNPAID";
    if (paidAmount >= effectiveFee) {
      newStatus = "PAID";
    } else if (paidAmount > 0) {
      newStatus = "PARTIAL";
    } else {
      newStatus = "UNPAID";
    }

    // Update tuition with scholarship tracking
    await prisma.tuition.update({
      where: { id: tuition.id },
      data: {
        scholarshipAmount: nominal,
        status: newStatus,
      },
    });

    result.autoPayments.push({
      tuitionId: tuition.id,
      amount: 0, // No actual payment, just scholarship
    });
  }

  result.tuitionsAffected = tuitions.length;

  return result;
}

/**
 * Calculate scholarship coverage percentage
 */
export function calculateScholarshipCoverage(
  scholarshipAmount: number,
  monthlyFee: number,
): {
  percentage: number;
  isFullScholarship: boolean;
  remainingAmount: number;
} {
  const percentage = Math.min((scholarshipAmount / monthlyFee) * 100, 100);
  const isFullScholarship = percentage >= 100;
  const remainingAmount = Math.max(monthlyFee - scholarshipAmount, 0);

  return {
    percentage,
    isFullScholarship,
    remainingAmount,
  };
}

/**
 * Get the fee amount for a class (from existing tuitions or default)
 */
export async function getClassFeeAmount(
  classAcademicId: string,
  prisma: PrismaClient,
): Promise<number | null> {
  const tuition = await prisma.tuition.findFirst({
    where: { classAcademicId },
    select: { feeAmount: true },
  });

  return tuition ? Number(tuition.feeAmount) : null;
}
