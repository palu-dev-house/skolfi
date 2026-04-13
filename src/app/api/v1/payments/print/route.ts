import type { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const academicYearId = searchParams.get("academicYearId");
  const mode = searchParams.get("mode") || "today"; // "today" | "all"

  const where: Prisma.PaymentWhereInput = {};

  // Filter by academic year through tuition -> classAcademic
  if (academicYearId) {
    where.tuition = {
      classAcademic: {
        academicYearId,
      },
    };
  }

  // Filter for today only
  if (mode === "today") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    where.paymentDate = {
      gte: todayStart,
      lte: todayEnd,
    };
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      tuition: {
        include: {
          student: {
            select: {
              nis: true,
              name: true,
              parentName: true,
            },
          },
          classAcademic: {
            select: {
              className: true,
              academicYear: { select: { year: true } },
            },
          },
        },
      },
      employee: {
        select: { name: true },
      },
    },
    orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
  });

  return successResponse({ payments });
}
