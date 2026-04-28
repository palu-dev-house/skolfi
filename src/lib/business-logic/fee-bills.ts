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
    name: string;
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
export interface PriceWarning {
  serviceName: string;
  period: string;
  year: number;
}

export async function generateFeeBillsForSubscription(
  tx: TxClient,
  subscription: SubscriptionWithContext,
  academicYear: AcademicYearCtx,
): Promise<{
  created: number;
  skipped: number;
  priceWarnings: PriceWarning[];
}> {
  const months = getMonthsInAcademicYear(
    academicYear.startDate,
    academicYear.endDate,
  );
  const priceWarnings: PriceWarning[] = [];
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
        priceWarnings.push({
          serviceName: subscription.feeService.name,
          period,
          year,
        });
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
  priceWarnings: PriceWarning[];
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

  const services = await prisma.feeService.findMany({
    where: { academicYearId, isActive: true },
    include: {
      prices: true,
      subscriptions: {
        include: {
          student: { select: { id: true, exitedAt: true } },
        },
      },
    },
  });

  const months = getMonthsInAcademicYear(
    academicYear.startDate,
    academicYear.endDate,
  );

  let created = 0;
  let skipped = 0;
  let exitSkipped = 0;
  const priceWarningKeys = new Set<string>();
  const priceWarnings: PriceWarning[] = [];

  for (const service of services) {
    if (service.subscriptions.length === 0) continue;

    const subscriptionIds = service.subscriptions.map((s) => s.id);
    const existing = await prisma.feeBill.findMany({
      where: { subscriptionId: { in: subscriptionIds } },
      select: { subscriptionId: true, period: true, year: true },
    });
    const existingKeys = new Set(
      existing.map((b) => `${b.subscriptionId}:${b.period}:${b.year}`),
    );

    const rowsToCreate: Prisma.FeeBillCreateManyInput[] = [];

    for (const sub of service.subscriptions) {
      let touched = false;

      for (const { period, year } of months) {
        const firstDay = new Date(year, monthIndexFromPeriod(period), 1);
        const lastDay = new Date(year, monthIndexFromPeriod(period) + 1, 0);

        if (sub.startDate.getTime() > lastDay.getTime()) continue;
        if (sub.endDate && sub.endDate.getTime() < firstDay.getTime()) continue;
        if (
          sub.student.exitedAt &&
          firstDay.getTime() > sub.student.exitedAt.getTime()
        ) {
          continue;
        }

        const key = `${sub.id}:${period}:${year}`;
        if (existingKeys.has(key)) {
          skipped += 1;
          touched = true;
          continue;
        }

        let amount: Prisma.Decimal;
        try {
          amount = resolvePriceForPeriod(service.prices, period, year);
        } catch (err) {
          if (err instanceof NoPriceForPeriodError) {
            const key = `${service.id}:${period}:${year}`;
            if (!priceWarningKeys.has(key)) {
              priceWarningKeys.add(key);
              priceWarnings.push({
                serviceName: service.name,
                period,
                year,
              });
            }
            continue;
          }
          throw err;
        }

        const dueDate = new Date(firstDay);
        dueDate.setDate(firstDay.getDate() + 10);

        rowsToCreate.push({
          subscriptionId: sub.id,
          feeServiceId: service.id,
          studentId: sub.studentId,
          period,
          year,
          amount,
          dueDate,
        });
        touched = true;
      }

      if (!touched && sub.student.exitedAt) {
        exitSkipped += 1;
      }
    }

    if (rowsToCreate.length > 0) {
      const CHUNK = 1000;
      for (let i = 0; i < rowsToCreate.length; i += CHUNK) {
        const chunk = rowsToCreate.slice(i, i + CHUNK);
        const res = await prisma.feeBill.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        created += res.count;
        skipped += chunk.length - res.count;
      }
    }
  }

  return {
    created,
    skipped,
    priceWarnings,
    exitSkipped,
  };
}
