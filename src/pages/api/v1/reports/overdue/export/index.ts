import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth } from "@/lib/api-auth";
import { getOverdueTuitions } from "@/lib/business-logic/overdue-calculator";
import { getPeriodDisplayName } from "@/lib/business-logic/tuition-generator";
import { prisma } from "@/lib/prisma";

async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const classAcademicId = searchParams.get("classAcademicId") || undefined;
  const grade = searchParams.get("grade")
    ? Number(searchParams.get("grade"))
    : undefined;
  const academicYearId = searchParams.get("academicYearId") || undefined;

  // Get overdue items
  const overdueItems = await getOverdueTuitions(
    { classAcademicId, grade, academicYearId },
    prisma,
  );

  // Get student details
  const studentIdList = [...new Set(overdueItems.map((i) => i.studentId))];
  const students = await prisma.student.findMany({
    where: { nis: { in: studentIdList } },
    select: { nis: true, parentName: true },
  });
  const studentDetails = new Map(
    students.map((s) => [s.nis, { parentName: s.parentName }]),
  );

  // Prepare Excel data
  const excelData = overdueItems.map((item) => ({
    "Student NIS": item.studentId,
    "Student Name": item.studentName,
    "Parent Name": studentDetails.get(item.studentId)?.parentName || "",
    "Parent Phone": item.parentPhone,
    Class: item.className,
    Grade: item.grade,
    Period: getPeriodDisplayName(item.period),
    Year: item.year,
    "Fee Amount": item.feeAmount,
    "Paid Amount": item.paidAmount,
    Outstanding: item.outstandingAmount,
    "Due Date": item.dueDate.toISOString().split("T")[0],
    "Days Overdue": item.daysOverdue,
  }));

  // Create workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 12 }, // NIS
    { wch: 25 }, // Student Name
    { wch: 25 }, // Parent Name
    { wch: 15 }, // Parent Phone
    { wch: 20 }, // Class
    { wch: 8 }, // Grade
    { wch: 12 }, // Month
    { wch: 8 }, // Year
    { wch: 15 }, // Fee Amount
    { wch: 15 }, // Paid Amount
    { wch: 15 }, // Outstanding
    { wch: 12 }, // Due Date
    { wch: 12 }, // Days Overdue
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Overdue Report");

  // Add summary sheet
  const summaryData = [
    {
      Metric: "Total Students with Overdue",
      Value: new Set(overdueItems.map((i) => i.studentId)).size,
    },
    { Metric: "Total Overdue Records", Value: overdueItems.length },
    {
      Metric: "Total Outstanding Amount",
      Value: overdueItems.reduce((sum, i) => sum + i.outstandingAmount, 0),
    },
    { Metric: "Report Generated", Value: new Date().toISOString() },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Convert to buffer
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const filename = `overdue-report-${new Date().toISOString().split("T")[0]}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export default createApiHandler({ GET });
