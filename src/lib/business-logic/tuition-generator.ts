import type { Month, PaymentFrequency } from "@/generated/prisma/client";

// ============================================
// TYPES
// ============================================

export interface PeriodDiscount {
  period: string;
  discountedFee: number;
  reason?: string;
}

export interface TuitionGenerationParams {
  classAcademicId: string;
  frequency: PaymentFrequency;
  feeAmount: number;
  periodDiscounts?: PeriodDiscount[]; // Optional period-specific discounts
  students: Array<{
    id: string;
    startJoinDate: Date;
    exitedAt: Date | null;
  }>;
  academicYear: {
    startDate: Date;
    endDate: Date;
  };
}

export interface GeneratedTuition {
  classAcademicId: string;
  studentId: string;
  period: string;
  month?: Month; // For backward compatibility with MONTHLY
  year: number;
  feeAmount: number;
  dueDate: Date;
  status: "UNPAID";
}

// ============================================
// CONSTANTS
// ============================================

export const PERIODS = {
  MONTHLY: [
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
  ] as const,
  QUARTERLY: ["Q1", "Q2", "Q3", "Q4"] as const,
  SEMESTER: ["SEM1", "SEM2"] as const,
};

export const PERIOD_MONTHS: Record<string, Month[]> = {
  // Quarterly periods
  Q1: ["JULY", "AUGUST", "SEPTEMBER"],
  Q2: ["OCTOBER", "NOVEMBER", "DECEMBER"],
  Q3: ["JANUARY", "FEBRUARY", "MARCH"],
  Q4: ["APRIL", "MAY", "JUNE"],
  // Semester periods
  SEM1: ["JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"],
  SEM2: ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE"],
};

const MONTH_TO_NUMBER: Record<Month, number> = {
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

const NUMBER_TO_MONTH: Record<number, Month> = {
  1: "JANUARY",
  2: "FEBRUARY",
  3: "MARCH",
  4: "APRIL",
  5: "MAY",
  6: "JUNE",
  7: "JULY",
  8: "AUGUST",
  9: "SEPTEMBER",
  10: "OCTOBER",
  11: "NOVEMBER",
  12: "DECEMBER",
};

// ============================================
// PERIOD DISPLAY NAMES
// ============================================

export function getPeriodDisplayName(period: string): string {
  const names: Record<string, string> = {
    // Monthly
    JULY: "July",
    AUGUST: "August",
    SEPTEMBER: "September",
    OCTOBER: "October",
    NOVEMBER: "November",
    DECEMBER: "December",
    JANUARY: "January",
    FEBRUARY: "February",
    MARCH: "March",
    APRIL: "April",
    MAY: "May",
    JUNE: "June",
    // Quarterly
    Q1: "Q1 (Jul-Sep)",
    Q2: "Q2 (Oct-Dec)",
    Q3: "Q3 (Jan-Mar)",
    Q4: "Q4 (Apr-Jun)",
    // Semester
    SEM1: "Semester 1 (Jul-Dec)",
    SEM2: "Semester 2 (Jan-Jun)",
  };
  return names[period] || period;
}

/**
 * Get month display name (for backward compatibility)
 */
export function getMonthDisplayName(month: Month): string {
  return getPeriodDisplayName(month);
}

// ============================================
// FEE CALCULATIONS
// ============================================

/**
 * Calculate default fees based on monthly fee
 */
export function calculateDefaultFees(monthlyFee: number) {
  return {
    monthly: monthlyFee,
    quarterlyDefault: monthlyFee * 3,
    semesterDefault: monthlyFee * 6,
  };
}

/**
 * Calculate discount between base fee and actual fee
 */
export function calculateDiscount(baseFee: number, actualFee: number) {
  const discount = baseFee - actualFee;
  const percentage = baseFee > 0 ? (discount / baseFee) * 100 : 0;
  return { discount, percentage };
}

/**
 * Get the appropriate fee amount for a given frequency
 */
export function getFeeForFrequency(
  classAcademic: {
    paymentFrequency: PaymentFrequency;
    monthlyFee: number | null;
    quarterlyFee: number | null;
    semesterFee: number | null;
  },
  overrideFee?: number,
): number {
  if (overrideFee !== undefined) {
    return overrideFee;
  }

  const monthlyFee = Number(classAcademic.monthlyFee) || 0;

  switch (classAcademic.paymentFrequency) {
    case "MONTHLY":
      return monthlyFee;
    case "QUARTERLY":
      return Number(classAcademic.quarterlyFee) || monthlyFee * 3;
    case "SEMESTER":
      return Number(classAcademic.semesterFee) || monthlyFee * 6;
    default:
      return monthlyFee;
  }
}

// ============================================
// DUE DATE CALCULATIONS
// ============================================

/**
 * Get due date for a period (10th of first month in period)
 */
export function getPeriodDueDate(
  period: string,
  academicYear: { startDate: Date },
): Date {
  const startYear = academicYear.startDate.getFullYear();

  // Due date config: { month (1-12), yearOffset (0 = start year, 1 = next year) }
  const dueDateConfig: Record<string, { month: number; yearOffset: number }> = {
    // Monthly - first semester (start year)
    JULY: { month: 7, yearOffset: 0 },
    AUGUST: { month: 8, yearOffset: 0 },
    SEPTEMBER: { month: 9, yearOffset: 0 },
    OCTOBER: { month: 10, yearOffset: 0 },
    NOVEMBER: { month: 11, yearOffset: 0 },
    DECEMBER: { month: 12, yearOffset: 0 },
    // Monthly - second semester (next year)
    JANUARY: { month: 1, yearOffset: 1 },
    FEBRUARY: { month: 2, yearOffset: 1 },
    MARCH: { month: 3, yearOffset: 1 },
    APRIL: { month: 4, yearOffset: 1 },
    MAY: { month: 5, yearOffset: 1 },
    JUNE: { month: 6, yearOffset: 1 },
    // Quarterly
    Q1: { month: 7, yearOffset: 0 }, // Jul 10
    Q2: { month: 10, yearOffset: 0 }, // Oct 10
    Q3: { month: 1, yearOffset: 1 }, // Jan 10 (next year)
    Q4: { month: 4, yearOffset: 1 }, // Apr 10 (next year)
    // Semester
    SEM1: { month: 7, yearOffset: 0 }, // Jul 10
    SEM2: { month: 1, yearOffset: 1 }, // Jan 10 (next year)
  };

  const config = dueDateConfig[period];
  if (!config) {
    // Fallback to July of start year
    return new Date(startYear, 6, 10);
  }

  return new Date(startYear + config.yearOffset, config.month - 1, 10);
}

/**
 * Get due date for a monthly tuition (for backward compatibility)
 */
function _getDueDate(month: Month, year: number): Date {
  const monthNumber = MONTH_TO_NUMBER[month];
  return new Date(year, monthNumber - 1, 10);
}

/**
 * Get year for a period
 */
function getPeriodYear(
  period: string,
  academicYear: { startDate: Date },
): number {
  const startYear = academicYear.startDate.getFullYear();

  // Periods in second half of academic year (Jan-Jun) use next year
  const secondHalfPeriods = [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "Q3",
    "Q4",
    "SEM2",
  ];

  return secondHalfPeriods.includes(period) ? startYear + 1 : startYear;
}

// ============================================
// PERIOD DETERMINATION
// ============================================

/**
 * Get the period that contains a given month
 */
function getQuarterForMonth(month: Month): string {
  if (["JULY", "AUGUST", "SEPTEMBER"].includes(month)) return "Q1";
  if (["OCTOBER", "NOVEMBER", "DECEMBER"].includes(month)) return "Q2";
  if (["JANUARY", "FEBRUARY", "MARCH"].includes(month)) return "Q3";
  return "Q4";
}

function getSemesterForMonth(month: Month): string {
  if (
    ["JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"].includes(
      month,
    )
  ) {
    return "SEM1";
  }
  return "SEM2";
}

function getPeriodStartMonthIndex(
  period: string,
  frequency: PaymentFrequency,
): number {
  // Returns 0-indexed month for new Date(year, monthIndex, 1).
  if (frequency === "MONTHLY") {
    return MONTH_TO_NUMBER[period as Month] - 1;
  }
  if (frequency === "QUARTERLY") {
    if (period === "Q1") return 6; // July
    if (period === "Q2") return 9; // October
    if (period === "Q3") return 0; // January
    if (period === "Q4") return 3; // April
  }
  if (frequency === "SEMESTER") {
    if (period === "SEM1") return 6; // July
    if (period === "SEM2") return 0; // January
  }
  throw new Error(`Unknown period ${period} for frequency ${frequency}`);
}

/**
 * Get the starting period based on student join date
 */
function getStartingPeriod(
  startJoinDate: Date,
  frequency: PaymentFrequency,
  academicYear: { startDate: Date; endDate: Date },
): string | null {
  // If student joined before academic year, start from first period
  if (startJoinDate <= academicYear.startDate) {
    return PERIODS[frequency][0];
  }

  // If student joined after academic year, no periods
  if (startJoinDate > academicYear.endDate) {
    return null;
  }

  // Get the month of join
  const joinMonth = NUMBER_TO_MONTH[startJoinDate.getMonth() + 1];

  switch (frequency) {
    case "MONTHLY":
      return joinMonth;
    case "QUARTERLY":
      return getQuarterForMonth(joinMonth);
    case "SEMESTER":
      return getSemesterForMonth(joinMonth);
    default:
      return joinMonth;
  }
}

/**
 * Check if a period should be included based on starting period
 */
function shouldIncludePeriod(
  period: string,
  startPeriod: string | null,
  frequency: PaymentFrequency,
): boolean {
  if (!startPeriod) return false;

  const periods = PERIODS[frequency] as readonly string[];
  const periodIndex = periods.indexOf(period);
  const startIndex = periods.indexOf(startPeriod);

  return periodIndex >= startIndex;
}

// ============================================
// TUITION GENERATION
// ============================================

/**
 * Generate tuitions for students based on payment frequency
 */
export function generateTuitions(
  params: TuitionGenerationParams,
): GeneratedTuition[] {
  const tuitions: GeneratedTuition[] = [];
  const {
    classAcademicId,
    frequency,
    feeAmount,
    periodDiscounts,
    students,
    academicYear,
  } = params;

  // Create a map for quick discount lookup
  const discountMap = new Map<string, number>();
  if (periodDiscounts) {
    for (const discount of periodDiscounts) {
      discountMap.set(discount.period, discount.discountedFee);
    }
  }

  for (const student of students) {
    const startPeriod = getStartingPeriod(
      student.startJoinDate,
      frequency,
      academicYear,
    );

    const periods = PERIODS[frequency] as readonly string[];

    for (const period of periods) {
      if (shouldIncludePeriod(period, startPeriod, frequency)) {
        const year = getPeriodYear(period, academicYear);

        if (
          student.exitedAt &&
          new Date(
            year,
            getPeriodStartMonthIndex(period, frequency),
            1,
          ).getTime() > student.exitedAt.getTime()
        ) {
          continue;
        }

        // Use period-specific discounted fee if available, otherwise use default fee
        const periodFee = discountMap.get(period) ?? feeAmount;

        const tuition: GeneratedTuition = {
          classAcademicId,
          studentId: student.id,
          period,
          year,
          feeAmount: periodFee,
          dueDate: getPeriodDueDate(period, academicYear),
          status: "UNPAID",
        };

        // For monthly frequency, also set the month field for backward compatibility
        if (frequency === "MONTHLY") {
          tuition.month = period as Month;
        }

        tuitions.push(tuition);
      }
    }
  }

  return tuitions;
}

/**
 * Legacy function for backward compatibility - generates monthly tuitions
 */
export function generateMonthlyTuitions(params: {
  classAcademicId: string;
  feeAmount: number;
  students: Array<{
    id: string;
    startJoinDate: Date;
    exitedAt: Date | null;
  }>;
  academicYear: {
    startDate: Date;
    endDate: Date;
  };
}): GeneratedTuition[] {
  return generateTuitions({
    ...params,
    frequency: "MONTHLY",
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate total tuition for a student based on frequency
 */
export function calculateTotalTuition(
  feeAmount: number,
  frequency: PaymentFrequency,
  startJoinDate: Date,
  academicYear: { startDate: Date; endDate: Date },
): { total: number; periods: number } {
  const startPeriod = getStartingPeriod(startJoinDate, frequency, academicYear);
  const periods = PERIODS[frequency] as readonly string[];

  let count = 0;
  for (const period of periods) {
    if (shouldIncludePeriod(period, startPeriod, frequency)) {
      count++;
    }
  }

  return {
    total: feeAmount * count,
    periods: count,
  };
}

/**
 * Get record count for a frequency
 */
export function getRecordCountForFrequency(
  frequency: PaymentFrequency,
): number {
  return PERIODS[frequency].length;
}

/**
 * Academic year month order (July to June)
 */
export const ACADEMIC_MONTH_ORDER: Month[] = [
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
];

/**
 * Check if a period is a monthly period
 */
export function isMonthlyPeriod(period: string): period is Month {
  return (PERIODS.MONTHLY as readonly string[]).includes(period);
}

/**
 * Check if a period is a quarterly period
 */
export function isQuarterlyPeriod(period: string): boolean {
  return (PERIODS.QUARTERLY as readonly string[]).includes(period);
}

/**
 * Check if a period is a semester period
 */
export function isSemesterPeriod(period: string): boolean {
  return (PERIODS.SEMESTER as readonly string[]).includes(period);
}

/**
 * Get frequency type from a period
 */
export function getFrequencyFromPeriod(period: string): PaymentFrequency {
  if (isQuarterlyPeriod(period)) return "QUARTERLY";
  if (isSemesterPeriod(period)) return "SEMESTER";
  return "MONTHLY";
}
