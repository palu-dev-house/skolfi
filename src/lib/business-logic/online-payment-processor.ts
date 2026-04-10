import type {
  OnlinePaymentStatus,
  PaymentStatus,
  PrismaClient,
} from "@/generated/prisma/client";
import {
  cancelTransaction,
  createSnapTransaction,
  generateOrderId,
} from "@/lib/midtrans";

export interface CreateOnlinePaymentParams {
  studentNis: string;
  tuitionIds: string[];
}

export interface OnlinePaymentResult {
  id: string;
  orderId: string;
  snapToken: string;
  snapRedirectUrl: string;
  grossAmount: number;
}

/**
 * Create an online payment via Midtrans Snap
 */
export async function createOnlinePayment(
  params: CreateOnlinePaymentParams,
  prisma: PrismaClient,
): Promise<OnlinePaymentResult> {
  const { studentNis, tuitionIds } = params;

  // Check payment settings
  const settings = await prisma.paymentSetting.findUnique({
    where: { id: "default" },
  });
  if (settings && !settings.onlinePaymentEnabled) {
    throw new Error(
      settings.maintenanceMessage || "Online payment is currently disabled",
    );
  }

  // Get student info
  const student = await prisma.student.findUnique({
    where: { nis: studentNis },
  });
  if (!student) throw new Error("Student not found");

  // Get tuitions and validate ownership
  const tuitions = await prisma.tuition.findMany({
    where: {
      id: { in: tuitionIds },
      studentNis,
    },
    include: {
      classAcademic: {
        select: { className: true, academicYear: { select: { year: true } } },
      },
    },
  });

  if (tuitions.length !== tuitionIds.length) {
    throw new Error("Some tuitions not found or do not belong to this student");
  }

  // Validate all tuitions are payable (not PAID)
  for (const tuition of tuitions) {
    if (tuition.status === "PAID") {
      throw new Error(
        `Tuition ${tuition.period} ${tuition.year} is already paid`,
      );
    }
  }

  // Check no existing PENDING online payment covers these tuitions
  const existingPending = await prisma.onlinePaymentItem.findFirst({
    where: {
      tuitionId: { in: tuitionIds },
      onlinePayment: { status: "PENDING" },
    },
  });
  if (existingPending) {
    throw new Error(
      "One or more tuitions already have a pending online payment",
    );
  }

  // Calculate amounts
  const itemDetails = tuitions.map((t) => {
    const remaining =
      Number(t.feeAmount) -
      Number(t.paidAmount) -
      Number(t.scholarshipAmount) -
      Number(t.discountAmount);
    return {
      id: t.id,
      name: `${t.classAcademic.className} - ${t.period} ${t.year}`,
      price: Math.max(Math.round(remaining), 0),
      quantity: 1,
    };
  });

  const grossAmount = itemDetails.reduce((sum, item) => sum + item.price, 0);
  if (grossAmount <= 0) {
    throw new Error("Total payment amount must be greater than 0");
  }

  // Create Snap transaction
  const orderId = generateOrderId(studentNis);
  const snapResult = await createSnapTransaction({
    orderId,
    grossAmount,
    customerDetails: {
      firstName: student.name,
      phone: student.parentPhone,
    },
    itemDetails,
  });

  // Save to database
  const onlinePayment = await prisma.onlinePayment.create({
    data: {
      orderId,
      studentNis,
      grossAmount,
      snapToken: snapResult.token,
      snapRedirectUrl: snapResult.redirectUrl,
      status: "PENDING",
      items: {
        create: itemDetails.map((item) => ({
          tuitionId: item.id,
          amount: item.price,
        })),
      },
    },
  });

  return {
    id: onlinePayment.id,
    orderId,
    snapToken: snapResult.token,
    snapRedirectUrl: snapResult.redirectUrl,
    grossAmount,
  };
}

/**
 * Settle an online payment — update tuitions and create payment records
 */
export async function settleOnlinePayment(
  orderId: string,
  webhookData: {
    paymentType?: string;
    bank?: string;
    vaNumber?: string;
    billKey?: string;
    billerCode?: string;
    settlementTime?: string;
    transactionTime?: string;
    rawResponse: string;
  },
  prisma: PrismaClient,
): Promise<void> {
  const onlinePayment = await prisma.onlinePayment.findUnique({
    where: { orderId },
    include: { items: { include: { tuition: true } } },
  });

  if (!onlinePayment) throw new Error("Online payment not found");
  if (onlinePayment.status === "SETTLEMENT") return; // Idempotent

  await prisma.$transaction(async (tx) => {
    // Update online payment status
    await tx.onlinePayment.update({
      where: { id: onlinePayment.id },
      data: {
        status: "SETTLEMENT",
        bank: webhookData.bank,
        vaNumber: webhookData.vaNumber,
        billKey: webhookData.billKey,
        billerCode: webhookData.billerCode,
        paymentType: webhookData.paymentType,
        midtransResponse: webhookData.rawResponse,
        settlementTime: webhookData.settlementTime
          ? new Date(webhookData.settlementTime)
          : new Date(),
        transactionTime: webhookData.transactionTime
          ? new Date(webhookData.transactionTime)
          : undefined,
      },
    });

    // Process each tuition
    for (const item of onlinePayment.items) {
      const tuition = item.tuition;
      const payAmount = Number(item.amount);
      const currentPaid = Number(tuition.paidAmount);
      const feeAmount = Number(tuition.feeAmount);
      const scholarshipAmount = Number(tuition.scholarshipAmount);
      const discountAmount = Number(tuition.discountAmount);
      const effectiveFee = Math.max(
        feeAmount - scholarshipAmount - discountAmount,
        0,
      );

      const newPaid = currentPaid + payAmount;
      let newStatus: PaymentStatus;
      if (newPaid >= effectiveFee) {
        newStatus = "PAID";
      } else if (newPaid > 0) {
        newStatus = "PARTIAL";
      } else {
        newStatus = "UNPAID";
      }

      // Create payment record (no employeeId for online payments)
      await tx.payment.create({
        data: {
          tuitionId: tuition.id,
          onlinePaymentId: onlinePayment.id,
          amount: payAmount,
          scholarshipAmount: Number(tuition.scholarshipAmount),
          notes: `Online payment - ${orderId}`,
        },
      });

      // Update tuition
      await tx.tuition.update({
        where: { id: tuition.id },
        data: {
          paidAmount: newPaid,
          status: newStatus,
        },
      });
    }

    // Update student lastPaymentAt
    await tx.student.update({
      where: { nis: onlinePayment.studentNis },
      data: { lastPaymentAt: new Date() },
    });
  });
}

/**
 * Update online payment status (for expire, cancel, deny, failure)
 */
export async function updateOnlinePaymentStatus(
  orderId: string,
  status: OnlinePaymentStatus,
  rawResponse: string,
  prisma: PrismaClient,
): Promise<void> {
  const onlinePayment = await prisma.onlinePayment.findUnique({
    where: { orderId },
  });
  if (!onlinePayment) throw new Error("Online payment not found");
  if (onlinePayment.status === "SETTLEMENT") return; // Don't override settlement

  await prisma.onlinePayment.update({
    where: { orderId },
    data: {
      status,
      midtransResponse: rawResponse,
    },
  });
}

/**
 * Cancel a pending online payment
 */
export async function cancelOnlinePayment(
  onlinePaymentId: string,
  studentNis: string,
  prisma: PrismaClient,
): Promise<void> {
  const onlinePayment = await prisma.onlinePayment.findUnique({
    where: { id: onlinePaymentId },
  });

  if (!onlinePayment) throw new Error("Online payment not found");
  if (onlinePayment.studentNis !== studentNis) {
    throw new Error("Unauthorized");
  }
  if (onlinePayment.status !== "PENDING") {
    throw new Error("Only pending payments can be cancelled");
  }

  // Cancel on Midtrans
  try {
    await cancelTransaction(onlinePayment.orderId);
  } catch {
    // Midtrans may reject if already expired — still mark as cancelled locally
  }

  await prisma.onlinePayment.update({
    where: { id: onlinePaymentId },
    data: { status: "CANCEL" },
  });
}
