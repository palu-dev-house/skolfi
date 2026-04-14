import type { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");
  const studentNis = searchParams.get("studentNis") || undefined;
  const feeServiceId = searchParams.get("feeServiceId") || undefined;
  const activeParam = searchParams.get("active");

  const where: Prisma.FeeSubscriptionWhereInput = {};
  if (studentNis) where.studentNis = studentNis;
  if (feeServiceId) where.feeServiceId = feeServiceId;

  const now = new Date();
  if (activeParam === "true") {
    where.OR = [{ endDate: null }, { endDate: { gte: now } }];
  } else if (activeParam === "false") {
    where.endDate = { lt: now };
  }

  const [subscriptions, total] = await Promise.all([
    prisma.feeSubscription.findMany({
      where,
      include: {
        feeService: {
          select: { id: true, name: true, category: true },
        },
        student: {
          select: { nis: true, name: true },
        },
        _count: { select: { bills: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ startDate: "desc" }],
    }),
    prisma.feeSubscription.count({ where }),
  ]);

  return successResponse({
    subscriptions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const { feeServiceId, studentNis, startDate, endDate, notes } = body as {
      feeServiceId?: string;
      studentNis?: string;
      startDate?: string;
      endDate?: string | null;
      notes?: string | null;
    };

    if (!feeServiceId || !studentNis || !startDate) {
      return errorResponse(
        "feeServiceId, studentNis, and startDate are required",
        "VALIDATION_ERROR",
        400,
      );
    }

    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) {
      return errorResponse(
        "startDate must be a valid date",
        "VALIDATION_ERROR",
        400,
      );
    }

    let end: Date | null = null;
    if (endDate) {
      end = new Date(endDate);
      if (Number.isNaN(end.getTime())) {
        return errorResponse(
          "endDate must be a valid date",
          "VALIDATION_ERROR",
          400,
        );
      }
      if (end < start) {
        return errorResponse(
          "endDate must be on or after startDate",
          "VALIDATION_ERROR",
          400,
        );
      }
    }

    const [feeService, student] = await Promise.all([
      prisma.feeService.findUnique({
        where: { id: feeServiceId },
        select: { id: true },
      }),
      prisma.student.findUnique({
        where: { nis: studentNis },
        select: { nis: true },
      }),
    ]);

    if (!feeService) {
      return errorResponse("Fee service not found", "NOT_FOUND", 404);
    }
    if (!student) {
      return errorResponse("Student not found", "NOT_FOUND", 404);
    }

    const created = await prisma.feeSubscription.create({
      data: {
        feeServiceId,
        studentNis,
        startDate: start,
        endDate: end,
        notes: notes ?? null,
      },
      include: {
        feeService: { select: { id: true, name: true, category: true } },
        student: { select: { nis: true, name: true } },
      },
    });

    return successResponse(created, 201);
  } catch (error) {
    console.error("Create fee subscription error:", error);
    return errorResponse("Failed to create subscription", "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET, POST });
