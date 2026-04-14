import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  try {
    const existing = await prisma.feeSubscription.findUnique({
      where: { id },
    });
    if (!existing) {
      return errorResponse("Subscription not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const { endDate, notes } = body as {
      endDate?: string | null;
      notes?: string | null;
    };

    const data: Record<string, unknown> = {};

    if (endDate !== undefined) {
      if (endDate === null) {
        data.endDate = null;
      } else {
        const parsed = new Date(endDate);
        if (Number.isNaN(parsed.getTime())) {
          return errorResponse(
            "endDate must be a valid date or null",
            "VALIDATION_ERROR",
            400,
          );
        }
        if (parsed < existing.startDate) {
          return errorResponse(
            "endDate must be on or after startDate",
            "VALIDATION_ERROR",
            400,
          );
        }
        data.endDate = parsed;
      }
    }

    if (notes !== undefined) {
      data.notes = notes;
    }

    const updated = await prisma.feeSubscription.update({
      where: { id },
      data,
      include: {
        feeService: { select: { id: true, name: true, category: true } },
        student: { select: { nis: true, name: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    console.error("Update fee subscription error:", error);
    return errorResponse("Failed to update subscription", "SERVER_ERROR", 500);
  }
}

async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  try {
    const subscription = await prisma.feeSubscription.findUnique({
      where: { id },
      include: { _count: { select: { bills: true } } },
    });

    if (!subscription) {
      return errorResponse("Subscription not found", "NOT_FOUND", 404);
    }

    if (subscription._count.bills > 0) {
      return errorResponse(
        "Cannot delete subscription with existing bills. End the subscription instead.",
        "CONFLICT",
        409,
      );
    }

    await prisma.feeSubscription.delete({ where: { id } });

    return successResponse({ message: "Subscription deleted" });
  } catch (error) {
    console.error("Delete fee subscription error:", error);
    return errorResponse("Failed to delete subscription", "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ PATCH, DELETE });
