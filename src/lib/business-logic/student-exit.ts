import type { PaymentFrequency } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
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

export interface PartialWarning {
  tuitionId: string;
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

  const student = await prisma.student.findUnique({ where: { nis } });
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

  return prisma.$transaction(async (tx) => {
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

    return { voidedCount: toVoid.length, partialWarnings };
  });
}
