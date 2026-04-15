import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  type BillBreakdown,
  getClassSummary,
} from "@/lib/business-logic/overdue-calculator";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

const zeroBreakdown = (): BillBreakdown => ({
  totalBills: 0,
  paid: 0,
  partial: 0,
  unpaid: 0,
  totalAmount: 0,
  totalPaid: 0,
  totalOutstanding: 0,
});

function addBreakdown(a: BillBreakdown, b: BillBreakdown): BillBreakdown {
  return {
    totalBills: a.totalBills + b.totalBills,
    paid: a.paid + b.paid,
    partial: a.partial + b.partial,
    unpaid: a.unpaid + b.unpaid,
    totalAmount: a.totalAmount + b.totalAmount,
    totalPaid: a.totalPaid + b.totalPaid,
    totalOutstanding: a.totalOutstanding + b.totalOutstanding,
  };
}

async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const searchParams = request.nextUrl.searchParams;
    const academicYearId = searchParams.get("academicYearId") || undefined;

    const classSummaries = await getClassSummary({ academicYearId }, prisma);

    const overallTotals = classSummaries.reduce(
      (acc, cls) => ({
        totalStudents: acc.totalStudents + cls.statistics.totalStudents,
        totalTuitions: acc.totalTuitions + cls.statistics.totalTuitions,
        paid: acc.paid + cls.statistics.paid,
        unpaid: acc.unpaid + cls.statistics.unpaid,
        partial: acc.partial + cls.statistics.partial,
        totalFees: acc.totalFees + cls.statistics.totalFees,
        totalScholarships:
          acc.totalScholarships + cls.statistics.totalScholarships,
        totalDiscounts: acc.totalDiscounts + cls.statistics.totalDiscounts,
        totalEffectiveFees:
          acc.totalEffectiveFees + cls.statistics.totalEffectiveFees,
        totalPaid: acc.totalPaid + cls.statistics.totalPaid,
        totalOutstanding:
          acc.totalOutstanding + cls.statistics.totalOutstanding,
        feeBill: addBreakdown(acc.feeBill, cls.statistics.feeBill),
        serviceFeeBill: addBreakdown(
          acc.serviceFeeBill,
          cls.statistics.serviceFeeBill,
        ),
      }),
      {
        totalStudents: 0,
        totalTuitions: 0,
        paid: 0,
        unpaid: 0,
        partial: 0,
        totalFees: 0,
        totalScholarships: 0,
        totalDiscounts: 0,
        totalEffectiveFees: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        feeBill: zeroBreakdown(),
        serviceFeeBill: zeroBreakdown(),
      },
    );

    return successResponse({
      classes: classSummaries,
      totals: overallTotals,
    });
  } catch (error) {
    console.error("Class summary error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET });
