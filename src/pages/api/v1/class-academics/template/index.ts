import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { createClassTemplate } from "@/lib/excel-templates/class-template";
import { workbookToBuffer } from "@/lib/excel-utils";
import { prisma } from "@/lib/prisma";

async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const academicYears = await prisma.academicYear.findMany({
    select: { year: true },
    orderBy: { year: "desc" },
  });

  const workbook = createClassTemplate(academicYears.map((ay) => ay.year));
  const buffer = workbookToBuffer(workbook);

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="class-import-template.xlsx"',
    },
  });
}

export default createApiHandler({ GET });
