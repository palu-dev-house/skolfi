import type {
  OnlinePaymentStatus,
  PaymentStatus,
  PrismaClient,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { assertSingleBillTarget } from "@/lib/business-logic/payment-items";
import {
  cancelTransaction,
  createSnapTransaction,
  generateOrderId,
} from "@/lib/midtrans";
import type { OnlinePaymentItemInput } from "@/lib/validations/schemas/online-payment.schema";

export interface OnlinePaymentResult {
  id: string;
  orderId: string;
  snapToken: string;
  snapRedirectUrl: string;
  grossAmount: number;
}

const MONTH_LABEL: Record<string, string> = {
  JANUARY: "Jan",
  FEBRUARY: "Feb",
  MARCH: "Mar",
  APRIL: "Apr",
  MAY: "May",
  JUNE: "Jun",
  JULY: "Jul",
  AUGUST: "Aug",
  SEPTEMBER: "Sep",
  OCTOBER: "Oct",
  NOVEMBER: "Nov",
  DECEMBER: "Dec",
};

function periodLabel(period: string, year: number): string {
  return `${MONTH_LABEL[period] ?? period} ${year}`;
}

type Line = {
  id: string;
  price: number;
  quantity: 1;
  name: string;
  itemInput: {
    tuitionId?: string;
    feeBillId?: string;
    serviceFeeBillId?: string;
    amount: Prisma.Decimal;
  };
};

/**
 * Create an online payment via Midtrans Snap
 */
export async function createOnlinePayment(
  args: {
    studentId: string;
    items: OnlinePaymentItemInput[];
  },
  prisma: PrismaClient,
): Promise<OnlinePaymentResult> {
  const { studentId, items } = args;

  // Assert single bill target invariant per item
  for (const item of items) {
    assertSingleBillTarget({
      tuitionId: item.tuitionId ?? null,
      feeBillId: item.feeBillId ?? null,
      serviceFeeBillId: item.serviceFeeBillId ?? null,
    });
  }

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
    where: { id: studentId },
  });
  if (!student) throw new Error("Student not found");

  // Load all bills, enforce ownership + unpaid
  const tuitionIds = items.map((i) => i.tuitionId).filter(Boolean) as string[];
  const feeBillIds = items.map((i) => i.feeBillId).filter(Boolean) as string[];
  const serviceFeeBillIds = items
    .map((i) => i.serviceFeeBillId)
    .filter(Boolean) as string[];

  const [tuitions, feeBills, serviceFeeBills] = await Promise.all([
    tuitionIds.length
      ? prisma.tuition.findMany({
          where: { id: { in: tuitionIds }, studentId },
          include: { classAcademic: true },
        })
      : Promise.resolve([]),
    feeBillIds.length
      ? prisma.feeBill.findMany({
          where: { id: { in: feeBillIds }, studentId },
          include: { feeService: true },
        })
      : Promise.resolve([]),
    serviceFeeBillIds.length
      ? prisma.serviceFeeBill.findMany({
          where: { id: { in: serviceFeeBillIds }, studentId },
          include: { serviceFee: true },
        })
      : Promise.resolve([]),
  ]);

  if (
    tuitions.length !== tuitionIds.length ||
    feeBills.length !== feeBillIds.length ||
    serviceFeeBills.length !== serviceFeeBillIds.length
  ) {
    throw new Error("One or more bills not found or not yours");
  }

  const lines: Line[] = [];

  for (const t of tuitions) {
    if (
      (t.status as PaymentStatus) === "PAID" ||
      (t.status as PaymentStatus) === "VOID"
    ) {
      throw new Error(`Tuition ${t.id} not payable`);
    }
    const remaining = new Prisma.Decimal(t.feeAmount)
      .minus(t.scholarshipAmount)
      .minus(t.discountAmount)
      .minus(t.paidAmount);
    if (remaining.lte(0)) continue;
    lines.push({
      id: `TUI-${t.id}`,
      price: remaining.toNumber(),
      quantity: 1,
      name: `SPP ${periodLabel(t.period, t.year)}`,
      itemInput: { tuitionId: t.id, amount: remaining },
    });
  }

  for (const b of feeBills) {
    if (
      (b.status as PaymentStatus) === "PAID" ||
      (b.status as PaymentStatus) === "VOID"
    ) {
      throw new Error(`Fee bill ${b.id} not payable`);
    }
    const remaining = new Prisma.Decimal(b.amount).minus(b.paidAmount);
    if (remaining.lte(0)) continue;
    lines.push({
      id: `FEE-${b.id}`,
      price: remaining.toNumber(),
      quantity: 1,
      name: `${b.feeService.name} ${periodLabel(b.period, b.year)}`,
      itemInput: { feeBillId: b.id, amount: remaining },
    });
  }

  for (const b of serviceFeeBills) {
    if (
      (b.status as PaymentStatus) === "PAID" ||
      (b.status as PaymentStatus) === "VOID"
    ) {
      throw new Error(`Service fee bill ${b.id} not payable`);
    }
    const remaining = new Prisma.Decimal(b.amount).minus(b.paidAmount);
    if (remaining.lte(0)) continue;
    lines.push({
      id: `SVC-${b.id}`,
      price: remaining.toNumber(),
      quantity: 1,
      name: `${b.serviceFee.name} ${periodLabel(b.period, b.year)}`,
      itemInput: { serviceFeeBillId: b.id, amount: remaining },
    });
  }

  if (lines.length === 0) throw new Error("Nothing to pay");

  const grossAmount = lines.reduce((sum, l) => sum + l.price, 0);

  // Create Snap transaction
  const orderId = generateOrderId(studentId);
  const snapResult = await createSnapTransaction({
    orderId,
    grossAmount,
    customerDetails: {
      firstName: student.name,
      phone: student.parentPhone,
    },
    itemDetails: lines.map((l) => ({
      id: l.id,
      name: l.name,
      price: Math.round(l.price),
      quantity: l.quantity,
    })),
  });

  // Save to database
  const onlinePayment = await prisma.onlinePayment.create({
    data: {
      orderId,
      studentId,
      grossAmount,
      snapToken: snapResult.token,
      snapRedirectUrl: snapResult.redirectUrl,
      status: "PENDING",
      items: {
        create: lines.map((l) => ({
          tuitionId: l.itemInput.tuitionId ?? null,
          feeBillId: l.itemInput.feeBillId ?? null,
          serviceFeeBillId: l.itemInput.serviceFeeBillId ?? null,
          amount: l.itemInput.amount,
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

// ── Internal settlement helpers ──────────────────────────────────────────────

type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export async function applyTuitionPayment(
  tx: TxClient,
  tuitionId: string,
  amount: Prisma.Decimal,
): Promise<void> {
  const tuition = await tx.tuition.findUniqueOrThrow({
    where: { id: tuitionId },
  });
  const feeAmount = new Prisma.Decimal(tuition.feeAmount);
  const scholarshipAmount = new Prisma.Decimal(tuition.scholarshipAmount);
  const discountAmount = new Prisma.Decimal(tuition.discountAmount);
  const effectiveFee = Prisma.Decimal.max(
    feeAmount.minus(scholarshipAmount).minus(discountAmount),
    new Prisma.Decimal(0),
  );
  const newPaid = new Prisma.Decimal(tuition.paidAmount).plus(amount);
  let newStatus: PaymentStatus;
  if (newPaid.gte(effectiveFee)) {
    newStatus = "PAID";
  } else if (newPaid.gt(0)) {
    newStatus = "PARTIAL";
  } else {
    newStatus = "UNPAID";
  }
  await tx.tuition.update({
    where: { id: tuitionId },
    data: { paidAmount: newPaid, status: newStatus },
  });
}

export async function applyFeeBillPayment(
  tx: TxClient,
  feeBillId: string,
  amount: Prisma.Decimal,
): Promise<void> {
  const bill = await tx.feeBill.findUniqueOrThrow({ where: { id: feeBillId } });
  const newPaid = new Prisma.Decimal(bill.paidAmount).plus(amount);
  let newStatus: PaymentStatus;
  if (newPaid.gte(new Prisma.Decimal(bill.amount))) {
    newStatus = "PAID";
  } else if (newPaid.gt(0)) {
    newStatus = "PARTIAL";
  } else {
    newStatus = "UNPAID";
  }
  await tx.feeBill.update({
    where: { id: feeBillId },
    data: { paidAmount: newPaid, status: newStatus },
  });
}

export async function applyServiceFeeBillPayment(
  tx: TxClient,
  serviceFeeBillId: string,
  amount: Prisma.Decimal,
): Promise<void> {
  const bill = await tx.serviceFeeBill.findUniqueOrThrow({
    where: { id: serviceFeeBillId },
  });
  const newPaid = new Prisma.Decimal(bill.paidAmount).plus(amount);
  let newStatus: PaymentStatus;
  if (newPaid.gte(new Prisma.Decimal(bill.amount))) {
    newStatus = "PAID";
  } else if (newPaid.gt(0)) {
    newStatus = "PARTIAL";
  } else {
    newStatus = "UNPAID";
  }
  await tx.serviceFeeBill.update({
    where: { id: serviceFeeBillId },
    data: { paidAmount: newPaid, status: newStatus },
  });
}

export async function reverseFeeBillPayment(
  tx: TxClient,
  feeBillId: string,
  amount: Prisma.Decimal,
): Promise<void> {
  const bill = await tx.feeBill.findUniqueOrThrow({ where: { id: feeBillId } });
  const newPaid = Prisma.Decimal.max(
    new Prisma.Decimal(bill.paidAmount).minus(amount),
    new Prisma.Decimal(0),
  );
  let newStatus: PaymentStatus;
  if (newPaid.gte(new Prisma.Decimal(bill.amount))) {
    newStatus = "PAID";
  } else if (newPaid.gt(0)) {
    newStatus = "PARTIAL";
  } else {
    newStatus = "UNPAID";
  }
  await tx.feeBill.update({
    where: { id: feeBillId },
    data: { paidAmount: newPaid, status: newStatus },
  });
}

export async function reverseServiceFeeBillPayment(
  tx: TxClient,
  serviceFeeBillId: string,
  amount: Prisma.Decimal,
): Promise<void> {
  const bill = await tx.serviceFeeBill.findUniqueOrThrow({
    where: { id: serviceFeeBillId },
  });
  const newPaid = Prisma.Decimal.max(
    new Prisma.Decimal(bill.paidAmount).minus(amount),
    new Prisma.Decimal(0),
  );
  let newStatus: PaymentStatus;
  if (newPaid.gte(new Prisma.Decimal(bill.amount))) {
    newStatus = "PAID";
  } else if (newPaid.gt(0)) {
    newStatus = "PARTIAL";
  } else {
    newStatus = "UNPAID";
  }
  await tx.serviceFeeBill.update({
    where: { id: serviceFeeBillId },
    data: { paidAmount: newPaid, status: newStatus },
  });
}

/**
 * Settle an online payment — update bills and create payment records
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
    include: {
      items: true,
    },
  });

  if (!onlinePayment) throw new Error("Online payment not found");
  if (onlinePayment.status === "SETTLEMENT") return; // Idempotent

  const settlementDate = webhookData.settlementTime
    ? new Date(webhookData.settlementTime)
    : new Date();

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
        settlementTime: settlementDate,
        transactionTime: webhookData.transactionTime
          ? new Date(webhookData.transactionTime)
          : undefined,
      },
    });

    // Process each item
    for (const item of onlinePayment.items) {
      assertSingleBillTarget({
        tuitionId: item.tuitionId,
        feeBillId: item.feeBillId,
        serviceFeeBillId: item.serviceFeeBillId,
      });

      const amount = new Prisma.Decimal(item.amount);

      if (item.tuitionId) {
        await tx.payment.create({
          data: {
            tuitionId: item.tuitionId,
            onlinePaymentId: onlinePayment.id,
            amount,
            scholarshipAmount: new Prisma.Decimal(0),
            paymentDate: settlementDate,
            notes: `Online payment ${orderId}`,
          },
        });
        await applyTuitionPayment(tx, item.tuitionId, amount);
      } else if (item.feeBillId) {
        await tx.payment.create({
          data: {
            feeBillId: item.feeBillId,
            onlinePaymentId: onlinePayment.id,
            amount,
            scholarshipAmount: new Prisma.Decimal(0),
            paymentDate: settlementDate,
            notes: `Online payment ${orderId}`,
          },
        });
        await applyFeeBillPayment(tx, item.feeBillId, amount);
      } else if (item.serviceFeeBillId) {
        await tx.payment.create({
          data: {
            serviceFeeBillId: item.serviceFeeBillId,
            onlinePaymentId: onlinePayment.id,
            amount,
            scholarshipAmount: new Prisma.Decimal(0),
            paymentDate: settlementDate,
            notes: `Online payment ${orderId}`,
          },
        });
        await applyServiceFeeBillPayment(tx, item.serviceFeeBillId, amount);
      }
    }

    // Update student lastPaymentAt
    await tx.student.update({
      where: { id: onlinePayment.studentId },
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
  studentId: string,
  prisma: PrismaClient,
): Promise<void> {
  const onlinePayment = await prisma.onlinePayment.findUnique({
    where: { id: onlinePaymentId },
  });

  if (!onlinePayment) throw new Error("Online payment not found");
  if (onlinePayment.studentId !== studentId) {
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
