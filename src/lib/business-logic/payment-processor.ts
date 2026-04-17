import type { PaymentStatus, PrismaClient } from "@/generated/prisma/client";
import type { prisma as prismaClient } from "@/lib/prisma";

type TxClient = Parameters<Parameters<typeof prismaClient.$transaction>[0]>[0];

export interface PaymentParams {
  tuitionId: string;
  amount: number;
  employeeId: string;
  notes?: string;
}

export interface PaymentResult {
  paymentId: string;
  newStatus: PaymentStatus;
  previousStatus: PaymentStatus;
  previousPaidAmount: number;
  newPaidAmount: number;
  remainingAmount: number;
  feeAmount: number;
  scholarshipAmount: number;
  discountAmount: number;
  effectiveFeeAmount: number;
}

/**
 * Process payment and update tuition status
 * Considers scholarship discount when determining if tuition is fully paid
 */
export async function processPayment(
  params: PaymentParams,
  prisma: PrismaClient | TxClient,
): Promise<PaymentResult> {
  const { tuitionId, amount, employeeId, notes } = params;

  // Get tuition
  const tuition = await prisma.tuition.findUnique({
    where: { id: tuitionId },
  });

  if (!tuition) {
    throw new Error("Tuition not found");
  }

  if (tuition.status === "PAID") {
    throw new Error("Tuition is already fully paid");
  }

  // Check for all scholarships (student can have multiple)
  const scholarships = await prisma.scholarship.findMany({
    where: {
      studentId: tuition.studentId,
      classAcademicId: tuition.classAcademicId,
    },
  });

  const feeAmount = Number(tuition.feeAmount);
  // Sum all scholarship amounts
  const scholarshipAmount = scholarships.reduce(
    (sum, s) => sum + Number(s.nominal),
    0,
  );
  // Get discount amount from tuition
  const discountAmount = Number(tuition.discountAmount) || 0;
  // Effective fee is the original fee minus scholarship and discount
  const effectiveFeeAmount = Math.max(
    feeAmount - scholarshipAmount - discountAmount,
    0,
  );

  const previousPaidAmount = Number(tuition.paidAmount);
  const previousStatus = tuition.status;

  // Calculate new paid amount
  const newPaidAmount = previousPaidAmount + amount;

  // Determine new status based on effective fee amount (considering scholarship)
  let newStatus: PaymentStatus;
  if (newPaidAmount >= effectiveFeeAmount) {
    newStatus = "PAID";
  } else if (newPaidAmount > 0) {
    newStatus = "PARTIAL";
  } else {
    newStatus = "UNPAID";
  }

  // Create payment record with scholarship info
  const payment = await prisma.payment.create({
    data: {
      tuitionId,
      employeeId,
      amount,
      scholarshipAmount,
      notes: notes || null,
    },
  });

  // Update tuition with scholarship amount tracked
  await prisma.tuition.update({
    where: { id: tuitionId },
    data: {
      paidAmount: newPaidAmount,
      scholarshipAmount,
      status: newStatus,
    },
  });

  return {
    paymentId: payment.id,
    newStatus,
    previousStatus,
    previousPaidAmount,
    newPaidAmount,
    remainingAmount: Math.max(effectiveFeeAmount - newPaidAmount, 0),
    feeAmount,
    scholarshipAmount,
    discountAmount,
    effectiveFeeAmount,
  };
}

/**
 * Reverse/delete payment and update tuition status
 * Considers scholarship discount when determining new status
 */
export async function reversePayment(
  paymentId: string,
  prisma: PrismaClient | TxClient,
): Promise<{
  tuitionId: string;
  newStatus: PaymentStatus;
  newPaidAmount: number;
}> {
  // Get payment with tuition
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { tuition: true },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  const tuition = payment.tuition;

  if (!tuition) {
    throw new Error(
      "Payment is not linked to a tuition and cannot be reversed via this function",
    );
  }

  // Check for all scholarships (student can have multiple)
  const scholarships = await prisma.scholarship.findMany({
    where: {
      studentId: tuition.studentId,
      classAcademicId: tuition.classAcademicId,
    },
  });

  const paymentAmount = Number(payment.amount);
  const currentPaidAmount = Number(tuition.paidAmount);
  const feeAmount = Number(tuition.feeAmount);
  // Sum all scholarship amounts
  const scholarshipAmount = scholarships.reduce(
    (sum, s) => sum + Number(s.nominal),
    0,
  );
  // Get discount amount from tuition
  const discountAmount = Number(tuition.discountAmount) || 0;
  const effectiveFeeAmount = Math.max(
    feeAmount - scholarshipAmount - discountAmount,
    0,
  );

  // Calculate new paid amount
  const newPaidAmount = Math.max(currentPaidAmount - paymentAmount, 0);

  // Determine new status based on effective fee amount
  let newStatus: PaymentStatus;
  if (newPaidAmount >= effectiveFeeAmount) {
    newStatus = "PAID";
  } else if (newPaidAmount > 0) {
    newStatus = "PARTIAL";
  } else {
    newStatus = "UNPAID";
  }

  // Update tuition
  await prisma.tuition.update({
    where: { id: tuition.id },
    data: {
      paidAmount: newPaidAmount,
      status: newStatus,
    },
  });

  // Delete payment
  await prisma.payment.delete({
    where: { id: paymentId },
  });

  return {
    tuitionId: tuition.id,
    newStatus,
    newPaidAmount,
  };
}

/**
 * Calculate payment summary for a tuition
 */
export function calculatePaymentSummary(
  feeAmount: number,
  paidAmount: number,
): {
  remaining: number;
  percentage: number;
  status: PaymentStatus;
} {
  const remaining = Math.max(feeAmount - paidAmount, 0);
  const percentage = feeAmount > 0 ? (paidAmount / feeAmount) * 100 : 0;

  let status: PaymentStatus;
  if (paidAmount >= feeAmount) {
    status = "PAID";
  } else if (paidAmount > 0) {
    status = "PARTIAL";
  } else {
    status = "UNPAID";
  }

  return {
    remaining,
    percentage: Math.min(percentage, 100),
    status,
  };
}
