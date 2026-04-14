import type { PaymentFrequency } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import {
  NoPriceForPeriodError,
  resolvePriceForPeriod,
} from "@/lib/business-logic/fee-bills";
import { prisma } from "@/lib/prisma";

const MONTH_NUMBER: Record<string, number> = {
  JANUARY: 1,
  FEBRUARY: 2,
  MARCH: 3,
  APRIL: 4,
  MAY: 5,
  JUNE: 6,
  JULY: 7,
  AUGUST: 8,
  SEPTEMBER: 9,
  OCTOBER: 10,
  NOVEMBER: 11,
  DECEMBER: 12,
};

const QUARTER_START_MONTH: Record<string, number> = {
  Q1: 7, // July
  Q2: 10, // October
  Q3: 1, // January
  Q4: 4, // April
};

const SEMESTER_START_MONTH: Record<string, number> = {
  SEM1: 7, // July
  SEM2: 1, // January
};

/**
 * First calendar day of a tuition period.
 * `year` is the calendar year stored on the Tuition row (Jan-Jun periods use academicYear.startYear+1).
 */
export function getPeriodStart(
  period: string,
  year: number,
  frequency: PaymentFrequency,
): Date {
  if (frequency === "MONTHLY") {
    const month = MONTH_NUMBER[period];
    if (!month) throw new Error(`Invalid monthly period: ${period}`);
    return new Date(year, month - 1, 1);
  }
  if (frequency === "QUARTERLY") {
    const month = QUARTER_START_MONTH[period];
    if (!month) throw new Error(`Invalid quarterly period: ${period}`);
    return new Date(year, month - 1, 1);
  }
  if (frequency === "SEMESTER") {
    const month = SEMESTER_START_MONTH[period];
    if (!month) throw new Error(`Invalid semester period: ${period}`);
    return new Date(year, month - 1, 1);
  }
  throw new Error(`Unknown frequency: ${frequency}`);
}

/**
 * True when the period begins strictly after the exit date.
 * Used to decide whether a tuition row should be auto-voided on exit.
 */
export function isPeriodAfterExit(
  period: string,
  year: number,
  frequency: PaymentFrequency,
  exitDate: Date,
): boolean {
  return getPeriodStart(period, year, frequency).getTime() > exitDate.getTime();
}

export interface RecordExitParams {
  nis: string;
  exitDate: Date;
  reason: string;
  employeeId: string;
}

export type PartialWarningSource = "tuition" | "feeBill" | "serviceFeeBill";

export interface PartialWarning {
  source: PartialWarningSource;
  /** Legacy field retained for backward compat when source === "tuition". */
  tuitionId?: string;
  /** Set when source === "feeBill". */
  feeBillId?: string;
  /** Set when source === "serviceFeeBill". */
  serviceFeeBillId?: string;
  period: string;
  year: number;
  paidAmount: string; // Decimal serialized
}

export interface RecordExitResult {
  voidedCount: number;
  partialWarnings: PartialWarning[];
}

export class StudentExitError extends Error {
  constructor(
    public code:
      | "NOT_FOUND"
      | "ALREADY_EXITED"
      | "DATE_BEFORE_JOIN"
      | "DATE_IN_FUTURE",
    message: string,
  ) {
    super(message);
    this.name = "StudentExitError";
  }
}

export async function recordStudentExit(
  params: RecordExitParams,
): Promise<RecordExitResult> {
  const { nis, exitDate, reason, employeeId } = params;

  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({ where: { nis } });
    if (!student) {
      throw new StudentExitError("NOT_FOUND", `Student ${nis} not found`);
    }
    if (student.exitedAt) {
      throw new StudentExitError(
        "ALREADY_EXITED",
        `Student ${nis} is already exited`,
      );
    }
    if (exitDate < student.startJoinDate) {
      throw new StudentExitError(
        "DATE_BEFORE_JOIN",
        "Exit date cannot be before student's join date",
      );
    }
    // Compare only the date (ignore time) so "today" is allowed.
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (exitDate > today) {
      throw new StudentExitError(
        "DATE_IN_FUTURE",
        "Exit date cannot be in the future",
      );
    }

    await tx.student.update({
      where: { nis },
      data: { exitedAt: exitDate, exitReason: reason, exitedBy: employeeId },
    });

    const candidates = await tx.tuition.findMany({
      where: {
        studentNis: nis,
        status: { in: ["UNPAID", "PARTIAL"] },
      },
      select: {
        id: true,
        period: true,
        year: true,
        status: true,
        paidAmount: true,
        classAcademic: { select: { paymentFrequency: true } },
      },
    });

    const toVoid: string[] = [];
    const partialWarnings: PartialWarning[] = [];

    for (const t of candidates) {
      if (
        !isPeriodAfterExit(
          t.period,
          t.year,
          t.classAcademic.paymentFrequency,
          exitDate,
        )
      ) {
        continue;
      }
      if (t.status === "PARTIAL") {
        partialWarnings.push({
          source: "tuition",
          tuitionId: t.id,
          period: t.period,
          year: t.year,
          paidAmount: t.paidAmount.toString(),
        });
        continue;
      }
      toVoid.push(t.id);
    }

    if (toVoid.length > 0) {
      await tx.tuition.updateMany({
        where: { id: { in: toVoid } },
        data: {
          status: "VOID",
          voidedByExit: true,
          feeAmount: new Prisma.Decimal(0),
          paidAmount: new Prisma.Decimal(0),
        },
      });
    }

    // --- FeeSubscription: cap endDate at exitDate for still-active subs ---
    await tx.feeSubscription.updateMany({
      where: {
        studentNis: nis,
        OR: [{ endDate: null }, { endDate: { gt: exitDate } }],
      },
      data: { endDate: exitDate },
    });

    // --- FeeBill: void future unpaid, warn on future partial ---
    const feeBillCandidates = await tx.feeBill.findMany({
      where: { studentNis: nis, status: { in: ["UNPAID", "PARTIAL"] } },
      select: {
        id: true,
        period: true,
        year: true,
        status: true,
        paidAmount: true,
      },
    });

    const feeBillsToVoid: string[] = [];
    for (const b of feeBillCandidates) {
      if (!isPeriodAfterExit(b.period, b.year, "MONTHLY", exitDate)) {
        continue;
      }
      if (b.status === "PARTIAL") {
        partialWarnings.push({
          source: "feeBill",
          feeBillId: b.id,
          period: b.period,
          year: b.year,
          paidAmount: b.paidAmount.toString(),
        });
        continue;
      }
      feeBillsToVoid.push(b.id);
    }

    if (feeBillsToVoid.length > 0) {
      await tx.feeBill.updateMany({
        where: { id: { in: feeBillsToVoid } },
        data: {
          status: "VOID",
          voidedByExit: true,
          amount: new Prisma.Decimal(0),
          paidAmount: new Prisma.Decimal(0),
        },
      });
    }

    // --- ServiceFeeBill: void future unpaid, warn on future partial ---
    const serviceBillCandidates = await tx.serviceFeeBill.findMany({
      where: { studentNis: nis, status: { in: ["UNPAID", "PARTIAL"] } },
      select: {
        id: true,
        period: true,
        year: true,
        status: true,
        paidAmount: true,
      },
    });

    const serviceBillsToVoid: string[] = [];
    for (const b of serviceBillCandidates) {
      if (!isPeriodAfterExit(b.period, b.year, "MONTHLY", exitDate)) {
        continue;
      }
      if (b.status === "PARTIAL") {
        partialWarnings.push({
          source: "serviceFeeBill",
          serviceFeeBillId: b.id,
          period: b.period,
          year: b.year,
          paidAmount: b.paidAmount.toString(),
        });
        continue;
      }
      serviceBillsToVoid.push(b.id);
    }

    if (serviceBillsToVoid.length > 0) {
      await tx.serviceFeeBill.updateMany({
        where: { id: { in: serviceBillsToVoid } },
        data: {
          status: "VOID",
          voidedByExit: true,
          amount: new Prisma.Decimal(0),
          paidAmount: new Prisma.Decimal(0),
        },
      });
    }

    return {
      voidedCount:
        toVoid.length + feeBillsToVoid.length + serviceBillsToVoid.length,
      partialWarnings,
    };
  });
}

export interface UndoExitParams {
  nis: string;
  employeeId: string; // reserved for future audit; not persisted today
}

export interface UndoExitResult {
  restoredCount: number;
}

export async function undoStudentExit(
  params: UndoExitParams,
): Promise<UndoExitResult> {
  const { nis } = params;

  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({ where: { nis } });
    if (!student) {
      throw new StudentExitError("NOT_FOUND", `Student ${nis} not found`);
    }
    if (!student.exitedAt) {
      throw new StudentExitError(
        "ALREADY_EXITED", // re-used: caller maps to 400
        `Student ${nis} is not currently exited`,
      );
    }

    // Find tuitions auto-voided by this exit, with their class fee config.
    const voided = await tx.tuition.findMany({
      where: { studentNis: nis, voidedByExit: true },
      select: {
        id: true,
        classAcademic: {
          select: {
            paymentFrequency: true,
            monthlyFee: true,
            quarterlyFee: true,
            semesterFee: true,
          },
        },
      },
    });

    let restoredCount = 0;
    for (const t of voided) {
      const c = t.classAcademic;
      const fee =
        c.paymentFrequency === "MONTHLY"
          ? c.monthlyFee
          : c.paymentFrequency === "QUARTERLY"
            ? c.quarterlyFee
            : c.semesterFee;
      if (fee == null) {
        // Class has no configured fee for its frequency — skip restore (data is inconsistent).
        continue;
      }
      await tx.tuition.update({
        where: { id: t.id },
        data: {
          status: "UNPAID",
          voidedByExit: false,
          feeAmount: fee,
        },
      });
      restoredCount += 1;
    }

    // --- Restore FeeSubscription rows capped at exit date ---
    const exitedAt = student.exitedAt; // snapshot before clearing below
    const _subsRestored = await tx.feeSubscription.updateMany({
      where: { studentNis: nis, endDate: exitedAt },
      data: { endDate: null },
    });

    // --- Restore FeeBill rows voided by this exit; re-resolve price per period ---
    const voidedFeeBills = await tx.feeBill.findMany({
      where: { studentNis: nis, voidedByExit: true },
      select: {
        id: true,
        feeServiceId: true,
        period: true,
        year: true,
      },
    });

    let feeBillsRestored = 0;
    for (const bill of voidedFeeBills) {
      const prices = await tx.feeServicePrice.findMany({
        where: { feeServiceId: bill.feeServiceId },
      });
      let amount: Prisma.Decimal;
      try {
        amount = resolvePriceForPeriod(prices, bill.period, bill.year);
      } catch (err) {
        if (err instanceof NoPriceForPeriodError) {
          // Same "data inconsistent — skip" pattern as the tuition branch.
          continue;
        }
        throw err;
      }
      await tx.feeBill.update({
        where: { id: bill.id },
        data: {
          status: "UNPAID",
          voidedByExit: false,
          amount,
          paidAmount: new Prisma.Decimal(0),
        },
      });
      feeBillsRestored += 1;
    }

    // --- Restore ServiceFeeBill rows voided by this exit ---
    const voidedServiceBills = await tx.serviceFeeBill.findMany({
      where: { studentNis: nis, voidedByExit: true },
      select: {
        id: true,
        serviceFee: {
          select: { id: true, amount: true, isActive: true },
        },
      },
    });

    let serviceBillsRestored = 0;
    for (const bill of voidedServiceBills) {
      if (!bill.serviceFee || !bill.serviceFee.isActive) {
        // ServiceFee deleted or inactive — leave voided.
        continue;
      }
      await tx.serviceFeeBill.update({
        where: { id: bill.id },
        data: {
          status: "UNPAID",
          voidedByExit: false,
          amount: new Prisma.Decimal(bill.serviceFee.amount),
          paidAmount: new Prisma.Decimal(0),
        },
      });
      serviceBillsRestored += 1;
    }

    await tx.student.update({
      where: { nis },
      data: { exitedAt: null, exitReason: null, exitedBy: null },
    });

    return {
      restoredCount: restoredCount + feeBillsRestored + serviceBillsRestored,
    };
  });
}
