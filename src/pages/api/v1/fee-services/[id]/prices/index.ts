import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const feeService = await prisma.feeService.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!feeService) {
    return errorResponse("Fee service not found", "NOT_FOUND", 404);
  }

  const prices = await prisma.feeServicePrice.findMany({
    where: { feeServiceId: id },
    orderBy: { effectiveFrom: "desc" },
  });

  return successResponse({ prices });
}

async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  try {
    const feeService = await prisma.feeService.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!feeService) {
      return errorResponse("Fee service not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const { effectiveFrom, amount } = body as {
      effectiveFrom?: string;
      amount?: string | number;
    };

    if (!effectiveFrom || amount === undefined || amount === null) {
      return errorResponse(
        "effectiveFrom and amount are required",
        "VALIDATION_ERROR",
        400,
      );
    }

    const parsed = new Date(effectiveFrom);
    if (Number.isNaN(parsed.getTime())) {
      return errorResponse(
        "effectiveFrom must be a valid date",
        "VALIDATION_ERROR",
        400,
      );
    }

    // Normalize to 1st of month at UTC midnight
    const normalized = new Date(
      Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1),
    );

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return errorResponse(
        "amount must be a non-negative number",
        "VALIDATION_ERROR",
        400,
      );
    }

    const existing = await prisma.feeServicePrice.findUnique({
      where: {
        feeServiceId_effectiveFrom: {
          feeServiceId: id,
          effectiveFrom: normalized,
        },
      },
    });
    if (existing) {
      return errorResponse(
        "A price for that month already exists",
        "CONFLICT",
        409,
      );
    }

    const created = await prisma.feeServicePrice.create({
      data: {
        feeServiceId: id,
        effectiveFrom: normalized,
        amount: numericAmount,
      },
    });

    return successResponse(created, 201);
  } catch (error) {
    console.error("Create fee service price error:", error);
    return errorResponse("Failed to create price entry", "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET, POST });
