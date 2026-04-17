import type {
  FeeServicePrice,
  FeeSubscription,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { PERIODS } from "@/lib/business-logic/tuition-generator";
import { prisma } from "@/lib/prisma";

export class NoPriceForPeriodError extends Error {
  constructor(
    public feeServiceId: string,
    public period: string,
    public year: number,
  ) {
    super(
      `No price defined for fee service ${feeServiceId} at ${period} ${year}`,
    );
    this.name = "NoPriceForPeriodError";
  }
}

const MONTH_INDEX: Record<string, number> = {
  JANUARY: 0,
  FEBRUARY: 1,
  MARCH: 2,
  APRIL: 3,
  MAY: 4,
  JUNE: 5,
  JULY: 6,
  AUGUST: 7,
  SEPTEMBER: 8,
  OCTOBER: 9,
  NOVEMBER: 10,
  DECEMBER: 11,
};

/**
 * 0-indexed month (for `new Date(year, monthIndex, 1)`) from a monthly period name.
 * Throws for non-monthly periods — FeeBill only supports monthly periods.
 */
export function monthIndexFromPeriod(period: string): number {
  const idx = MONTH_INDEX[period];
  if (idx === undefined) {
    throw new Error(`Invalid monthly period: ${period}`);
  }
  return idx;
}

/**
 * Find the latest `FeeServicePrice.effectiveFrom <= first day of (period, year)`.
 * Throws NoPriceForPeriodError when no row qualifies.
 */
export function resolvePriceForPeriod(
  prices: FeeServicePrice[],
  period: string,
  year: number,
): Prisma.Decimal {
  const firstDay = new Date(year, monthIndexFromPeriod(period), 1);
  let best: FeeServicePrice | null = null;
  for (const p of prices) {
    if (p.effectiveFrom.getTime() <= firstDay.getTime()) {
      if (!best || p.effectiveFrom.getTime() > best.effectiveFrom.getTime()) {
        best = p;
      }
    }
  }
  if (!best) {
    const serviceId = prices[0]?.feeServiceId ?? "<unknown>";
    throw new NoPriceForPeriodError(serviceId, period, year);
  }
  return new Prisma.Decimal(best.amount);
}

const ACADEMIC_MONTH_ORDER = PERIODS.MONTHLY; // JULY → JUNE

/**
 * List every (period, year) tuple between academic year start and end inclusive.
 * Second-half months (Jan-Jun) carry startYear+1.
 */
export function getMonthsInAcademicYear(
  startDate: Date,
  endDate: Date,
): Array<{ period: string; year: number }> {
  const startYear = startDate.getFullYear();
  const result: Array<{ period: string; year: number }> = [];
  const startIdx = startDate.getMonth(); // 0-11
  const endIdx = endDate.getMonth();

  // Walk from startDate to endDate month-by-month.
  let y = startYear;
  let m = startIdx;
  while (true) {
    const period = Object.entries(MONTH_INDEX).find(
      ([, idx]) => idx === m,
    )?.[0];
    if (
      period &&
      (ACADEMIC_MONTH_ORDER as readonly string[]).includes(period)
    ) {
      result.push({ period, year: y });
    }
    if (y === endDate.getFullYear() && m === endIdx) break;
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return result;
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

interface SubscriptionWithContext extends FeeSubscription {
  feeService: {
    id: string;
    prices: FeeServicePrice[];
  };
  student: {
    nis: string;
    exitedAt: Date | null;
  };
}

interface AcademicYearCtx {
  id: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Generate any missing FeeBill rows for one subscription across the academic year.
 * Existing rows are left untouched (idempotent via @@unique).
 */
export async function generateFeeBillsForSubscription(
  tx: TxClient,
  subscription: SubscriptionWithContext,
  academicYear: AcademicYearCtx,
): Promise<{ created: number; skipped: number; priceWarnings: string[] }> {
  const months = getMonthsInAcademicYear(
    academicYear.startDate,
    academicYear.endDate,
  );
  const priceWarnings: string[] = [];
  let created = 0;
  let skipped = 0;

  for (const { period, year } of months) {
    const firstDay = new Date(year, monthIndexFromPeriod(period), 1);
    const lastDay = new Date(year, monthIndexFromPeriod(period) + 1, 0);

    // Subscription must cover the period.
    if (subscription.startDate.getTime() > lastDay.getTime()) continue;
    if (
      subscription.endDate &&
      subscription.endDate.getTime() < firstDay.getTime()
    ) {
      continue;
    }

    // Skip periods starting after the student's exit.
    if (
      subscription.student.exitedAt &&
      firstDay.getTime() > subscription.student.exitedAt.getTime()
    ) {
      continue;
    }

    let amount: Prisma.Decimal;
    try {
      amount = resolvePriceForPeriod(
        subscription.feeService.prices,
        period,
        year,
      );
    } catch (err) {
      if (err instanceof NoPriceForPeriodError) {
        priceWarnings.push(
          `No price for service ${subscription.feeServiceId} at ${period} ${year}`,
        );
        continue;
      }
      throw err;
    }

    const dueDate = new Date(firstDay);
    dueDate.setDate(firstDay.getDate() + 10);

    // Idempotent insert: if the unique constraint fires, treat as skipped.
    const existing = await tx.feeBill.findUnique({
      where: {
        subscriptionId_period_year: {
          subscriptionId: subscription.id,
          period,
          year,
        },
      },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    await tx.feeBill.create({
      data: {
        subscriptionId: subscription.id,
        feeServiceId: subscription.feeServiceId,
        studentId: subscription.studentId,
        period,
        year,
        amount,
        dueDate,
      },
    });
    created += 1;
  }

  return { created, skipped, priceWarnings };
}

/**
 * Apply a cash payment to a FeeBill: update paidAmount and status.
 * Called inside a transaction.
 */
export async function applyFeeBillPayment(
  tx: TxClient,
  feeBillId: string,
  amount: Prisma.Decimal,
): Promise<void> {
  const bill = await tx.feeBill.findUnique({
    where: { id: feeBillId },
    select: { amount: true, paidAmount: true },
  });
  if (!bill) throw new Error(`FeeBill ${feeBillId} not found`);

  const newPaidAmount = new Prisma.Decimal(bill.paidAmount).add(amount);
  const newStatus = newPaidAmount.gte(bill.amount) ? "PAID" : "PARTIAL";

  await tx.feeBill.update({
    where: { id: feeBillId },
    data: { paidAmount: newPaidAmount, status: newStatus },
  });
}

export interface GenerateAllFeeBillsResult {
  created: number;
  skipped: number;
  priceWarnings: string[];
  exitSkipped: number;
}

/**
 * Generate bills for every active subscription × every active service in the
 * given academic year. Safe to re-run.
 */
export async function generateAllFeeBills(
  academicYearId: string,
): Promise<GenerateAllFeeBillsResult> {
  const academicYear = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
    select: { id: true, startDate: true, endDate: true },
  });
  if (!academicYear) {
    throw new Error(`Academic year ${academicYearId} not found`);
  }

  return prisma.$transaction(async (tx) => {
    const services = await tx.feeService.findMany({
      where: { academicYearId, isActive: true },
      include: {
        prices: true,
        subscriptions: {
          include: {
            feeService: { include: { prices: true } },
            student: { select: { id: true, exitedAt: true } },
          },
        },
      },
    });

    let created = 0;
    let skipped = 0;
    let exitSkipped = 0;
    const priceWarnings: string[] = [];

    for (const service of services) {
      for (const sub of service.subscriptions) {
        const preCount = created;
        const res = await generateFeeBillsForSubscription(
          tx,
          sub as unknown as SubscriptionWithContext,
          academicYear,
        );
        created += res.created;
        skipped += res.skipped;
        priceWarnings.push(...res.priceWarnings);
        if (res.created === 0 && res.skipped === 0 && sub.student.exitedAt) {
          exitSkipped += 1;
        }
        void preCount;
      }
    }

    return { created, skipped, priceWarnings, exitSkipped };
  });
}
