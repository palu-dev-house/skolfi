import type { PaymentStatus, PrismaClient } from "@/generated/prisma/client";

export interface OverdueItem {
  tuitionId: string;
  studentId: string;
  studentNis: string;
  schoolLevel: string;
  studentName: string;
  parentPhone: string;
  className: string;
  grade: number;
  section: string;
  period: string;
  year: number;
  feeAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: Date;
  daysOverdue: number;
  scholarshipAmount: number;
  discountAmount: number;
}

export interface OverdueByStudent {
  student: {
    nis: string;
    schoolLevel: string;
    name: string;
    parentName: string;
    parentPhone: string;
  };
  class: {
    className: string;
    grade: number;
    section: string;
  };
  overduePeriods: Array<{
    tuitionId: string;
    period: string;
    year: number;
    feeAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    dueDate: Date;
    daysOverdue: number;
    scholarshipAmount: number;
    discountAmount: number;
  }>;
  totalOverdue: number;
  overdueCount: number;
}

export interface OverdueSummary {
  totalStudents: number;
  totalOverdueAmount: number;
  totalOverdueRecords: number;
}

/**
 * Calculate days overdue from due date
 */
export function calculateDaysOverdue(dueDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  if (today <= due) return 0;

  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get overdue tuitions with filters
 */
export async function getOverdueTuitions(
  filters: {
    classAcademicId?: string;
    grade?: number;
    academicYearId?: string;
  },
  prisma: PrismaClient,
): Promise<OverdueItem[]> {
  const today = new Date();

  const where: Record<string, unknown> = {
    status: { in: ["UNPAID", "PARTIAL"] as PaymentStatus[] },
    dueDate: { lt: today },
  };

  if (filters.classAcademicId) {
    where.classAcademicId = filters.classAcademicId;
  }

  if (filters.grade || filters.academicYearId) {
    where.classAcademic = {};
    if (filters.grade) {
      (where.classAcademic as Record<string, unknown>).grade = filters.grade;
    }
    if (filters.academicYearId) {
      (where.classAcademic as Record<string, unknown>).academicYearId =
        filters.academicYearId;
    }
  }

  const tuitions = await prisma.tuition.findMany({
    where,
    include: {
      student: true,
      classAcademic: {
        include: {
          academicYear: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { student: { name: "asc" } }],
  });

  // Fetch scholarships for all relevant student+class combinations
  const scholarshipMap = new Map<string, number>();
  const studentClassPairs = tuitions.map((t) => ({
    studentId: t.studentId,
    classAcademicId: t.classAcademicId,
  }));

  if (studentClassPairs.length > 0) {
    const scholarships = await prisma.scholarship.findMany({
      where: {
        OR: studentClassPairs.map((pair) => ({
          studentId: pair.studentId,
          classAcademicId: pair.classAcademicId,
        })),
      },
    });

    // Sum scholarships per student+class
    scholarships.forEach((s) => {
      const key = `${s.studentId}-${s.classAcademicId}`;
      const current = scholarshipMap.get(key) || 0;
      scholarshipMap.set(key, current + Number(s.nominal));
    });
  }

  return tuitions.map((t) => {
    const scholarshipKey = `${t.studentId}-${t.classAcademicId}`;
    const scholarshipAmount = scholarshipMap.get(scholarshipKey) || 0;
    const feeAmount = Number(t.feeAmount);
    const discountAmount = Number(t.discountAmount) || 0;
    const effectiveFee = Math.max(
      feeAmount - scholarshipAmount - discountAmount,
      0,
    );
    const paidAmount = Number(t.paidAmount);

    return {
      tuitionId: t.id,
      studentId: t.studentId,
      studentNis: t.student.nis,
      schoolLevel: t.student.schoolLevel,
      studentName: t.student.name,
      parentPhone: t.student.parentPhone,
      className: t.classAcademic.className,
      grade: t.classAcademic.grade,
      section: t.classAcademic.section,
      period: t.period,
      year: t.year,
      feeAmount,
      paidAmount,
      outstandingAmount: Math.max(effectiveFee - paidAmount, 0),
      scholarshipAmount,
      discountAmount,
      dueDate: t.dueDate,
      daysOverdue: calculateDaysOverdue(t.dueDate),
    };
  });
}

/**
 * Group overdue items by student
 */
export function groupOverdueByStudent(
  items: OverdueItem[],
  studentDetails: Map<string, { parentName: string }>,
): OverdueByStudent[] {
  const grouped = new Map<string, OverdueByStudent>();

  items.forEach((item) => {
    const key = `${item.studentId}-${item.className}`;

    if (!grouped.has(key)) {
      const details = studentDetails.get(item.studentId);
      grouped.set(key, {
        student: {
          nis: item.studentNis,
          schoolLevel: item.schoolLevel,
          name: item.studentName,
          parentName: details?.parentName || "",
          parentPhone: item.parentPhone,
        },
        class: {
          className: item.className,
          grade: item.grade,
          section: item.section,
        },
        overduePeriods: [],
        totalOverdue: 0,
        overdueCount: 0,
      });
    }

    const student = grouped.get(key)!;
    student.overduePeriods.push({
      tuitionId: item.tuitionId,
      period: item.period,
      year: item.year,
      feeAmount: item.feeAmount,
      paidAmount: item.paidAmount,
      outstandingAmount: item.outstandingAmount,
      dueDate: item.dueDate,
      daysOverdue: item.daysOverdue,
      discountAmount: item.discountAmount,
      scholarshipAmount: item.scholarshipAmount,
    });
    student.totalOverdue += item.outstandingAmount;
    student.overdueCount++;
  });

  return Array.from(grouped.values());
}

/**
 * Calculate overdue summary statistics
 */
export function calculateOverdueSummary(items: OverdueItem[]): OverdueSummary {
  const uniqueStudents = new Set(items.map((i) => i.studentId));

  return {
    totalStudents: uniqueStudents.size,
    totalOverdueAmount: items.reduce((sum, i) => sum + i.outstandingAmount, 0),
    totalOverdueRecords: items.length,
  };
}

export interface OverdueFeeBillItem {
  feeBillId: string;
  studentId: string;
  studentName: string;
  parentPhone: string;
  parentName: string;
  className: string;
  grade: number;
  section: string;
  feeServiceName: string;
  category: "TRANSPORT" | "ACCOMMODATION";
  period: string;
  year: number;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: Date;
  daysOverdue: number;
}

export interface OverdueServiceFeeBillItem {
  serviceFeeBillId: string;
  studentId: string;
  studentName: string;
  parentPhone: string;
  parentName: string;
  className: string;
  grade: number;
  section: string;
  serviceFeeName: string;
  period: string;
  year: number;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: Date;
  daysOverdue: number;
}

export interface OverdueFeeBillByStudent {
  student: {
    nis: string;
    name: string;
    parentName: string;
    parentPhone: string;
  };
  class: {
    className: string;
    grade: number;
    section: string;
  };
  overdueBills: Array<{
    feeBillId: string;
    feeServiceName: string;
    category: "TRANSPORT" | "ACCOMMODATION";
    period: string;
    year: number;
    amount: number;
    paidAmount: number;
    outstandingAmount: number;
    dueDate: Date;
    daysOverdue: number;
  }>;
  totalOverdue: number;
  overdueCount: number;
}

export interface OverdueServiceFeeBillByStudent {
  student: {
    nis: string;
    name: string;
    parentName: string;
    parentPhone: string;
  };
  class: {
    className: string;
    grade: number;
    section: string;
  };
  overdueBills: Array<{
    serviceFeeBillId: string;
    serviceFeeName: string;
    period: string;
    year: number;
    amount: number;
    paidAmount: number;
    outstandingAmount: number;
    dueDate: Date;
    daysOverdue: number;
  }>;
  totalOverdue: number;
  overdueCount: number;
}

export async function getOverdueFeeBills(
  filters: {
    classAcademicId?: string;
    grade?: number;
    academicYearId?: string;
  },
  prisma: PrismaClient,
): Promise<OverdueFeeBillItem[]> {
  const today = new Date();
  const where: Record<string, unknown> = {
    status: { in: ["UNPAID", "PARTIAL"] as PaymentStatus[] },
    voidedByExit: false,
    dueDate: { lt: today },
  };
  if (filters.academicYearId) {
    where.feeService = { academicYearId: filters.academicYearId };
  }

  const bills = await prisma.feeBill.findMany({
    where,
    include: {
      student: {
        include: {
          studentClasses: { include: { classAcademic: true } },
        },
      },
      feeService: true,
    },
    orderBy: [{ dueDate: "asc" }, { student: { name: "asc" } }],
  });

  return bills
    .map((b) => {
      const cls =
        b.student.studentClasses.find(
          (sc) =>
            sc.classAcademic.academicYearId === b.feeService.academicYearId,
        )?.classAcademic ?? b.student.studentClasses[0]?.classAcademic;
      if (!cls) return null;
      if (filters.classAcademicId && cls.id !== filters.classAcademicId)
        return null;
      if (filters.grade && cls.grade !== filters.grade) return null;
      const amount = Number(b.amount);
      const paidAmount = Number(b.paidAmount);
      return {
        feeBillId: b.id,
        studentId: b.studentId,
        studentName: b.student.name,
        parentPhone: b.student.parentPhone,
        parentName: b.student.parentName,
        className: cls.className,
        grade: cls.grade,
        section: cls.section,
        feeServiceName: b.feeService.name,
        category: b.feeService.category as "TRANSPORT" | "ACCOMMODATION",
        period: b.period,
        year: b.year,
        amount,
        paidAmount,
        outstandingAmount: Math.max(amount - paidAmount, 0),
        dueDate: b.dueDate,
        daysOverdue: calculateDaysOverdue(b.dueDate),
      } satisfies OverdueFeeBillItem;
    })
    .filter((b): b is OverdueFeeBillItem => b !== null);
}

export async function getOverdueServiceFeeBills(
  filters: {
    classAcademicId?: string;
    grade?: number;
    academicYearId?: string;
  },
  prisma: PrismaClient,
): Promise<OverdueServiceFeeBillItem[]> {
  const today = new Date();
  const where: Record<string, unknown> = {
    status: { in: ["UNPAID", "PARTIAL"] as PaymentStatus[] },
    voidedByExit: false,
    dueDate: { lt: today },
  };
  if (filters.classAcademicId) where.classAcademicId = filters.classAcademicId;
  if (filters.grade || filters.academicYearId) {
    where.classAcademic = {};
    if (filters.grade)
      (where.classAcademic as Record<string, unknown>).grade = filters.grade;
    if (filters.academicYearId)
      (where.classAcademic as Record<string, unknown>).academicYearId =
        filters.academicYearId;
  }

  const bills = await prisma.serviceFeeBill.findMany({
    where,
    include: {
      student: true,
      serviceFee: true,
      classAcademic: true,
    },
    orderBy: [{ dueDate: "asc" }, { student: { name: "asc" } }],
  });

  return bills.map((b) => {
    const amount = Number(b.amount);
    const paidAmount = Number(b.paidAmount);
    return {
      serviceFeeBillId: b.id,
      studentId: b.studentId,
      studentName: b.student.name,
      parentPhone: b.student.parentPhone,
      parentName: b.student.parentName,
      className: b.classAcademic.className,
      grade: b.classAcademic.grade,
      section: b.classAcademic.section,
      serviceFeeName: b.serviceFee.name,
      period: b.period,
      year: b.year,
      amount,
      paidAmount,
      outstandingAmount: Math.max(amount - paidAmount, 0),
      dueDate: b.dueDate,
      daysOverdue: calculateDaysOverdue(b.dueDate),
    } satisfies OverdueServiceFeeBillItem;
  });
}

export function groupFeeBillsByStudent(
  items: OverdueFeeBillItem[],
): OverdueFeeBillByStudent[] {
  const grouped = new Map<string, OverdueFeeBillByStudent>();
  for (const item of items) {
    const key = `${item.studentId}-${item.className}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        student: {
          nis: item.studentId,
          name: item.studentName,
          parentName: item.parentName,
          parentPhone: item.parentPhone,
        },
        class: {
          className: item.className,
          grade: item.grade,
          section: item.section,
        },
        overdueBills: [],
        totalOverdue: 0,
        overdueCount: 0,
      });
    }
    const s = grouped.get(key)!;
    s.overdueBills.push({
      feeBillId: item.feeBillId,
      feeServiceName: item.feeServiceName,
      category: item.category,
      period: item.period,
      year: item.year,
      amount: item.amount,
      paidAmount: item.paidAmount,
      outstandingAmount: item.outstandingAmount,
      dueDate: item.dueDate,
      daysOverdue: item.daysOverdue,
    });
    s.totalOverdue += item.outstandingAmount;
    s.overdueCount++;
  }
  return Array.from(grouped.values());
}

export function groupServiceFeeBillsByStudent(
  items: OverdueServiceFeeBillItem[],
): OverdueServiceFeeBillByStudent[] {
  const grouped = new Map<string, OverdueServiceFeeBillByStudent>();
  for (const item of items) {
    const key = `${item.studentId}-${item.className}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        student: {
          nis: item.studentId,
          name: item.studentName,
          parentName: item.parentName,
          parentPhone: item.parentPhone,
        },
        class: {
          className: item.className,
          grade: item.grade,
          section: item.section,
        },
        overdueBills: [],
        totalOverdue: 0,
        overdueCount: 0,
      });
    }
    const s = grouped.get(key)!;
    s.overdueBills.push({
      serviceFeeBillId: item.serviceFeeBillId,
      serviceFeeName: item.serviceFeeName,
      period: item.period,
      year: item.year,
      amount: item.amount,
      paidAmount: item.paidAmount,
      outstandingAmount: item.outstandingAmount,
      dueDate: item.dueDate,
      daysOverdue: item.daysOverdue,
    });
    s.totalOverdue += item.outstandingAmount;
    s.overdueCount++;
  }
  return Array.from(grouped.values());
}

export function calculateGenericOverdueSummary(
  items: { studentId: string; outstandingAmount: number }[],
): OverdueSummary {
  const unique = new Set(items.map((i) => i.studentId));
  return {
    totalStudents: unique.size,
    totalOverdueAmount: items.reduce((sum, i) => sum + i.outstandingAmount, 0),
    totalOverdueRecords: items.length,
  };
}

/**
 * Get class summary statistics
 */
export interface BillBreakdown {
  totalBills: number;
  paid: number;
  partial: number;
  unpaid: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
}

const EMPTY_BREAKDOWN = (): BillBreakdown => ({
  totalBills: 0,
  paid: 0,
  partial: 0,
  unpaid: 0,
  totalAmount: 0,
  totalPaid: 0,
  totalOutstanding: 0,
});

export async function getClassSummary(
  filters: {
    academicYearId?: string;
  },
  prisma: PrismaClient,
): Promise<
  Array<{
    class: {
      id: string;
      className: string;
      grade: number;
      section: string;
    };
    statistics: {
      totalStudents: number;
      totalTuitions: number;
      paid: number;
      unpaid: number;
      partial: number;
      totalFees: number;
      totalScholarships: number;
      totalDiscounts: number;
      totalEffectiveFees: number;
      totalPaid: number;
      totalOutstanding: number;
      feeBill: BillBreakdown;
      serviceFeeBill: BillBreakdown;
    };
  }>
> {
  const classWhere: Record<string, unknown> = {};
  if (filters.academicYearId) {
    classWhere.academicYearId = filters.academicYearId;
  }

  const classes = await prisma.classAcademic.findMany({
    where: classWhere,
    include: {
      tuitions: {
        select: {
          studentId: true,
          feeAmount: true,
          scholarshipAmount: true,
          discountAmount: true,
          paidAmount: true,
          status: true,
        },
      },
      studentClasses: {
        select: { studentId: true },
      },
      serviceFeeBills: {
        select: {
          amount: true,
          paidAmount: true,
          status: true,
          voidedByExit: true,
        },
      },
    },
    orderBy: [{ grade: "asc" }, { section: "asc" }],
  });

  // Map studentId -> classAcademicId for the fetched classes
  const studentToClass = new Map<string, string>();
  for (const cls of classes) {
    for (const sc of cls.studentClasses || []) {
      studentToClass.set(sc.studentId, cls.id);
    }
  }

  // Fetch FeeBills for all enrolled students, filtered to the academic year when provided.
  const feeBills = studentToClass.size
    ? await prisma.feeBill.findMany({
        where: {
          studentId: { in: [...studentToClass.keys()] },
          ...(filters.academicYearId
            ? { feeService: { academicYearId: filters.academicYearId } }
            : {}),
        },
        select: {
          studentId: true,
          amount: true,
          paidAmount: true,
          status: true,
          voidedByExit: true,
        },
      })
    : [];

  const feeBillStatsByClass = new Map<string, BillBreakdown>();
  for (const bill of feeBills) {
    if (bill.voidedByExit) continue;
    const classId = studentToClass.get(bill.studentId);
    if (!classId) continue;
    const stats = feeBillStatsByClass.get(classId) ?? EMPTY_BREAKDOWN();
    const amount = Number(bill.amount);
    const paid = Number(bill.paidAmount);
    stats.totalBills += 1;
    stats.totalAmount += amount;
    stats.totalPaid += paid;
    stats.totalOutstanding += Math.max(amount - paid, 0);
    if (bill.status === "PAID") stats.paid += 1;
    else if (bill.status === "PARTIAL") stats.partial += 1;
    else if (bill.status === "UNPAID") stats.unpaid += 1;
    feeBillStatsByClass.set(classId, stats);
  }

  return classes.map((cls) => {
    const tuitions = cls.tuitions || [];
    const uniqueStudents = new Set(tuitions.map((t) => t.studentId));
    const paid = tuitions.filter((t) => t.status === "PAID").length;
    const unpaid = tuitions.filter((t) => t.status === "UNPAID").length;
    const partial = tuitions.filter((t) => t.status === "PARTIAL").length;

    const totalFees = tuitions.reduce((sum, t) => sum + Number(t.feeAmount), 0);

    // Use tracked scholarship amount from each tuition
    const totalScholarships = tuitions.reduce(
      (sum, t) => sum + Number(t.scholarshipAmount),
      0,
    );

    // Use tracked discount amount from each tuition
    const totalDiscounts = tuitions.reduce(
      (sum, t) => sum + Number(t.discountAmount || 0),
      0,
    );

    const totalPaid = tuitions.reduce(
      (sum, t) => sum + Number(t.paidAmount),
      0,
    );

    // Effective fees = total fees - scholarships - discounts
    const totalEffectiveFees = Math.max(
      totalFees - totalScholarships - totalDiscounts,
      0,
    );

    // Outstanding = effective fees - what's been paid
    const totalOutstanding = Math.max(totalEffectiveFees - totalPaid, 0);

    const serviceBills = (cls.serviceFeeBills || []).filter(
      (b) => !b.voidedByExit,
    );
    const serviceFeeBillStats = EMPTY_BREAKDOWN();
    for (const bill of serviceBills) {
      const amount = Number(bill.amount);
      const paidAmt = Number(bill.paidAmount);
      serviceFeeBillStats.totalBills += 1;
      serviceFeeBillStats.totalAmount += amount;
      serviceFeeBillStats.totalPaid += paidAmt;
      serviceFeeBillStats.totalOutstanding += Math.max(amount - paidAmt, 0);
      if (bill.status === "PAID") serviceFeeBillStats.paid += 1;
      else if (bill.status === "PARTIAL") serviceFeeBillStats.partial += 1;
      else if (bill.status === "UNPAID") serviceFeeBillStats.unpaid += 1;
    }

    return {
      class: {
        id: cls.id,
        className: cls.className,
        grade: cls.grade,
        section: cls.section,
      },
      statistics: {
        totalStudents: uniqueStudents.size,
        totalTuitions: tuitions.length,
        paid,
        unpaid,
        partial,
        totalFees,
        totalScholarships,
        totalDiscounts,
        totalEffectiveFees,
        totalPaid,
        totalOutstanding,
        feeBill: feeBillStatsByClass.get(cls.id) ?? EMPTY_BREAKDOWN(),
        serviceFeeBill: serviceFeeBillStats,
      },
    };
  });
}
