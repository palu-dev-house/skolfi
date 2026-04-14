import type { PaymentFrequency } from "@/generated/prisma/client";

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
