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
  nis: string;
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

  for (const period of serviceFee.billingMonths) {
    const year = yearForPeriod(period, academicYear);
    const firstDay = getPeriodStart(period, year, "MONTHLY");
    const dueDate = new Date(firstDay);
    dueDate.setDate(firstDay.getDate() + 10);

    for (const student of studentsInClass) {
      if (student.exitedAt && firstDay.getTime() > student.exitedAt.getTime()) {
        exitSkipped += 1;
        continue;
      }

      const existing = await tx.serviceFeeBill.findUnique({
        where: {
          serviceFeeId_studentNis_period_year: {
            serviceFeeId: serviceFee.id,
            studentNis: student.nis,
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

      await tx.serviceFeeBill.create({
        data: {
          serviceFeeId: serviceFee.id,
          studentNis: student.nis,
          classAcademicId: serviceFee.classAcademicId,
          period,
          year,
          amount: new Prisma.Decimal(serviceFee.amount),
          dueDate,
        },
      });
      created += 1;
    }
  }

  return { created, skipped, exitSkipped };
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

  return prisma.$transaction(async (tx) => {
    const classes = await tx.classAcademic.findMany({
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
            student: { select: { nis: true, exitedAt: true } },
          },
        },
      },
    });

    let created = 0;
    let skipped = 0;
    let exitSkipped = 0;

    for (const cls of classes) {
      const students: StudentCtx[] = cls.studentClasses.map((sc) => ({
        nis: sc.student.nis,
        exitedAt: sc.student.exitedAt,
      }));

      for (const fee of cls.serviceFees) {
        const res = await generateServiceFeeBillsForFee(
          tx,
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
  });
}

/**
 * Active ClassAcademic × active ServiceFee × billingMonths × enrolled students.
 * Safe to re-run (idempotent via @@unique([serviceFeeId, studentNis, period, year])).
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

  return prisma.$transaction(async (tx) => {
    const classes = await tx.classAcademic.findMany({
      where: { academicYearId: resolvedId },
      include: {
        serviceFees: { where: { isActive: true } },
        studentClasses: {
          include: {
            student: { select: { nis: true, exitedAt: true } },
          },
        },
      },
    });

    let created = 0;
    let skipped = 0;
    let exitSkipped = 0;

    for (const cls of classes) {
      const students: StudentCtx[] = cls.studentClasses.map((sc) => ({
        nis: sc.student.nis,
        exitedAt: sc.student.exitedAt,
      }));

      for (const fee of cls.serviceFees) {
        const res = await generateServiceFeeBillsForFee(
          tx,
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
  });
}
