import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  type GenerateAllFeeBillsResult,
  generateFeeBillsForSubscription,
} from "@/lib/business-logic/fee-bills";
import { prisma } from "@/lib/prisma";

async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const { feeServiceId, period, year } = body as {
      feeServiceId?: string;
      period?: string;
      year?: number;
    };

    if (!period || !year) {
      return errorResponse(
        "period and year are required",
        "VALIDATION_ERROR",
        400,
      );
    }

    // Resolve the academic year that contains the requested period/year.
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        startDate: { lte: new Date(Number(year), 11, 31) },
        endDate: { gte: new Date(Number(year), 0, 1) },
      },
      select: { id: true, startDate: true, endDate: true },
      orderBy: { startDate: "desc" },
    });

    if (!academicYear) {
      return errorResponse(
        "No academic year found covering the requested period",
        "NOT_FOUND",
        404,
      );
    }

    // Load matching subscriptions (optionally filtered by feeServiceId).
    const subscriptionWhere = feeServiceId
      ? {
          feeService: { academicYearId: academicYear.id },
          feeServiceId,
        }
      : { feeService: { academicYearId: academicYear.id } };

    const subscriptions = await prisma.feeSubscription.findMany({
      where: subscriptionWhere,
      include: {
        feeService: { include: { prices: true } },
        student: { select: { nis: true, exitedAt: true } },
      },
    });

    const result = await prisma.$transaction(
      async (tx): Promise<GenerateAllFeeBillsResult> => {
        let created = 0;
        let skipped = 0;
        let exitSkipped = 0;
        const priceWarnings: string[] = [];

        for (const sub of subscriptions) {
          const res = await generateFeeBillsForSubscription(
            tx,
            sub as Parameters<typeof generateFeeBillsForSubscription>[1],
            academicYear,
          );
          created += res.created;
          skipped += res.skipped;
          priceWarnings.push(...res.priceWarnings);
          if (res.created === 0 && res.skipped === 0 && sub.student.exitedAt) {
            exitSkipped += 1;
          }
        }

        return { created, skipped, priceWarnings, exitSkipped };
      },
    );

    return successResponse(result);
  } catch (error) {
    console.error("Generate fee bills error:", error);
    return errorResponse("Failed to generate fee bills", "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ POST });
