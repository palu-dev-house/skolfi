import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth } from "@/lib/api-auth";
import { getClassSummary } from "@/lib/business-logic/overdue-calculator";
import { prisma } from "@/lib/prisma";
import { formatGradeLabel } from "@/lib/tk-grade-label";

async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const academicYearId = searchParams.get("academicYearId") || undefined;

  const classSummaries = await getClassSummary({ academicYearId }, prisma);

  const tuitionRows = classSummaries.map((cls) => ({
    Class: cls.class.className,
    Grade: formatGradeLabel(cls.class.schoolLevel, cls.class.grade),
    Students: cls.statistics.totalStudents,
    "Total Bills": cls.statistics.totalTuitions,
    Paid: cls.statistics.paid,
    Partial: cls.statistics.partial,
    Unpaid: cls.statistics.unpaid,
    "Total Fees": cls.statistics.totalFees,
    Scholarships: cls.statistics.totalScholarships,
    Discounts: cls.statistics.totalDiscounts,
    "Net Due": cls.statistics.totalEffectiveFees,
    Collected: cls.statistics.totalPaid,
    Outstanding: cls.statistics.totalOutstanding,
  }));

  const feeBillRows = classSummaries.map((cls) => ({
    Class: cls.class.className,
    Grade: formatGradeLabel(cls.class.schoolLevel, cls.class.grade),
    "Total Bills": cls.statistics.feeBill.totalBills,
    Paid: cls.statistics.feeBill.paid,
    Partial: cls.statistics.feeBill.partial,
    Unpaid: cls.statistics.feeBill.unpaid,
    "Total Amount": cls.statistics.feeBill.totalAmount,
    Collected: cls.statistics.feeBill.totalPaid,
    Outstanding: cls.statistics.feeBill.totalOutstanding,
  }));

  const serviceFeeRows = classSummaries.map((cls) => ({
    Class: cls.class.className,
    Grade: formatGradeLabel(cls.class.schoolLevel, cls.class.grade),
    "Total Bills": cls.statistics.serviceFeeBill.totalBills,
    Paid: cls.statistics.serviceFeeBill.paid,
    Partial: cls.statistics.serviceFeeBill.partial,
    Unpaid: cls.statistics.serviceFeeBill.unpaid,
    "Total Amount": cls.statistics.serviceFeeBill.totalAmount,
    Collected: cls.statistics.serviceFeeBill.totalPaid,
    Outstanding: cls.statistics.serviceFeeBill.totalOutstanding,
  }));

  const workbook = XLSX.utils.book_new();

  const tuitionSheet = XLSX.utils.json_to_sheet(tuitionRows);
  tuitionSheet["!cols"] = [
    { wch: 16 },
    { wch: 6 },
    { wch: 10 },
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, tuitionSheet, "Tuition (SPP)");

  const feeBillSheet = XLSX.utils.json_to_sheet(feeBillRows);
  feeBillSheet["!cols"] = [
    { wch: 16 },
    { wch: 6 },
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    feeBillSheet,
    "Transport & Accommodation",
  );

  const serviceFeeSheet = XLSX.utils.json_to_sheet(serviceFeeRows);
  serviceFeeSheet["!cols"] = feeBillSheet["!cols"];
  XLSX.utils.book_append_sheet(workbook, serviceFeeSheet, "Service Fees");

  const buffer = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;
  const filename = `class-summary-${new Date().toISOString().split("T")[0]}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export default createApiHandler({ GET });
