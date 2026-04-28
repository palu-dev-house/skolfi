import type { Month, ServiceFee } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { getPeriodStart } from "@/lib/business-logic/student-exit";
import { prisma } from "@/lib/prisma";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

interface AcademicYearCtx {
  id: string;
  startDate: Date;
  endDate: Date;
}

interface StudentCtx {
  id: string;
  exitedAt: Date | null;
}

/**
 * Decide the calendar year for a monthly period relative to an academic year
 * that spans July → June. JULY..DECEMBER use startYear; JANUARY..JUNE use startYear+1.
 */
function yearForPeriod(period: Month, academicYear: AcademicYearCtx): number {
  const startYear = academicYear.startDate.getFullYear();
  const secondHalf: Month[] = [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
  ];
  return secondHalf.includes(period) ? startYear + 1 : startYear;
}

export async function generateServiceFeeBillsForFee(
  tx: TxClient,
  serviceFee: ServiceFee & { classAcademicId: string },
  studentsInClass: StudentCtx[],
  academicYear: AcademicYearCtx,
): Promise<{ created: number; skipped: number; exitSkipped: number }> {
  let created = 0;
  let skipped = 0;
  let exitSkipped = 0;

  if (studentsInClass.length === 0 || serviceFee.billingMonths.length === 0) {
    return { created, skipped, exitSkipped };
  }

  const studentIds = studentsInClass.map((s) => s.id);
  const periodYearPairs = serviceFee.billingMonths.map((period) => ({
    period,
    year: yearForPeriod(period, academicYear),
  }));

  const existingRows = await tx.serviceFeeBill.findMany({
    where: {
      serviceFeeId: serviceFee.id,
      studentId: { in: studentIds },
      OR: periodYearPairs.map((p) => ({ period: p.period, year: p.year })),
    },
    select: { studentId: true, period: true, year: true },
  });
  const existingKeys = new Set(
    existingRows.map((b) => `${b.studentId}:${b.period}:${b.year}`),
  );

  const rowsToCreate: Prisma.ServiceFeeBillCreateManyInput[] = [];

  for (const { period, year } of periodYearPairs) {
    const firstDay = getPeriodStart(period, year, "MONTHLY");
    const dueDate = new Date(firstDay);
    dueDate.setDate(firstDay.getDate() + 10);

    for (const student of studentsInClass) {
      if (student.exitedAt && firstDay.getTime() > student.exitedAt.getTime()) {
        exitSkipped += 1;
        continue;
      }

      const key = `${student.id}:${period}:${year}`;
      if (existingKeys.has(key)) {
        skipped += 1;
        continue;
      }

      rowsToCreate.push({
        serviceFeeId: serviceFee.id,
        studentId: student.id,
        classAcademicId: serviceFee.classAcademicId,
        period,
        year,
        amount: new Prisma.Decimal(serviceFee.amount),
        dueDate,
      });
    }
  }

  if (rowsToCreate.length > 0) {
    const CHUNK = 1000;
    for (let i = 0; i < rowsToCreate.length; i += CHUNK) {
      const chunk = rowsToCreate.slice(i, i + CHUNK);
      const res = await tx.serviceFeeBill.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      created += res.count;
      skipped += chunk.length - res.count;
    }
  }

  return { created, skipped, exitSkipped };
}

/**
 * Apply a cash payment to a ServiceFeeBill: update paidAmount and status.
 * Called inside a transaction.
 */
export async function applyServiceFeeBillPayment(
  tx: TxClient,
  serviceFeeBillId: string,
  amount: Prisma.Decimal,
): Promise<void> {
  const bill = await tx.serviceFeeBill.findUnique({
    where: { id: serviceFeeBillId },
    select: { amount: true, paidAmount: true },
  });
  if (!bill) throw new Error(`ServiceFeeBill ${serviceFeeBillId} not found`);

  const newPaidAmount = new Prisma.Decimal(bill.paidAmount).add(amount);
  const newStatus = newPaidAmount.gte(bill.amount) ? "PAID" : "PARTIAL";

  await tx.serviceFeeBill.update({
    where: { id: serviceFeeBillId },
    data: { paidAmount: newPaidAmount, status: newStatus },
  });
}

export interface GenerateAllServiceFeeBillsResult {
  created: number;
  skipped: number;
  exitSkipped: number;
}

/**
 * Targeted generator: generate bills for active ServiceFees in a given period/year,
 * optionally scoped to one classAcademic.
 * Safe to re-run (idempotent).
 */
export async function generateServiceFeeBills(opts: {
  classAcademicId?: string;
  period: string;
  year: number;
}): Promise<GenerateAllServiceFeeBillsResult> {
  const { classAcademicId, period, year } = opts;

  // Derive a pseudo academic year context from the period/year.
  // We use a fixed range wide enough to include the requested month.
  const academicYear: AcademicYearCtx = {
    id: "",
    startDate: new Date(year, 0, 1),
    endDate: new Date(year, 11, 31),
  };

  const classes = await prisma.classAcademic.findMany({
    where: classAcademicId ? { id: classAcademicId } : {},
    include: {
      serviceFees: {
        where: {
          isActive: true,
          billingMonths: { has: period as Month },
        },
      },
      studentClasses: {
        include: {
          student: { select: { id: true, exitedAt: true } },
        },
      },
    },
  });

  let created = 0;
  let skipped = 0;
  let exitSkipped = 0;

  for (const cls of classes) {
    const students: StudentCtx[] = cls.studentClasses.map((sc) => ({
      id: sc.student.id,
      exitedAt: sc.student.exitedAt,
    }));

    for (const fee of cls.serviceFees) {
      const res = await generateServiceFeeBillsForFee(
        prisma,
        fee,
        students,
        academicYear,
      );
      created += res.created;
      skipped += res.skipped;
      exitSkipped += res.exitSkipped;
    }
  }

  return { created, skipped, exitSkipped };
}

/**
 * Active ClassAcademic × active ServiceFee × billingMonths × enrolled students.
 * Safe to re-run (idempotent via @@unique([serviceFeeId, studentId, period, year])).
 * If academicYearId is omitted the active academic year is used.
 */
export async function generateAllServiceFeeBills(opts: {
  academicYearId?: string;
}): Promise<GenerateAllServiceFeeBillsResult> {
  let resolvedId = opts.academicYearId;
  if (!resolvedId) {
    const active = await prisma.academicYear.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!active) {
      throw new Error("No active academic year found");
    }
    resolvedId = active.id;
  }

  const academicYear = await prisma.academicYear.findUnique({
    where: { id: resolvedId },
    select: { id: true, startDate: true, endDate: true },
  });
  if (!academicYear) {
    throw new Error(`Academic year ${resolvedId} not found`);
  }

  const classes = await prisma.classAcademic.findMany({
    where: { academicYearId: resolvedId },
    include: {
      serviceFees: { where: { isActive: true } },
      studentClasses: {
        include: {
          student: { select: { id: true, exitedAt: true } },
        },
      },
    },
  });

  let created = 0;
  let skipped = 0;
  let exitSkipped = 0;

  for (const cls of classes) {
    const students: StudentCtx[] = cls.studentClasses.map((sc) => ({
      id: sc.student.id,
      exitedAt: sc.student.exitedAt,
    }));

    for (const fee of cls.serviceFees) {
      const res = await generateServiceFeeBillsForFee(
        prisma,
        fee,
        students,
        academicYear,
      );
      created += res.created;
      skipped += res.skipped;
      exitSkipped += res.exitSkipped;
    }
  }

  return { created, skipped, exitSkipped };
}
