import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { createScholarshipTemplate } from "@/lib/excel-templates/scholarship-template";
import { prisma } from "@/lib/prisma";

async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  try {
    // Get students and classes for reference sheets
    const students = await prisma.student.findMany({
      select: { nis: true, name: true },
      orderBy: { name: "asc" },
    });

    const classes = await prisma.classAcademic.findMany({
      select: { id: true, className: true },
      orderBy: { className: "asc" },
    });

    // Create workbook with template
    const workbook = createScholarshipTemplate(students, classes);

    // Convert to buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Return as file download
    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="scholarship-import-template.xlsx"',
      },
    });
  } catch (error) {
    console.error("Generate template error:", error);
    return new Response("Failed to generate template", { status: 500 });
  }
}

export default createApiHandler({ GET });
