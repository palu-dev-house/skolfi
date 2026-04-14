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

  const bill = await prisma.feeBill.findUnique({
    where: { id },
    include: {
      feeService: {
        select: { id: true, name: true, category: true },
      },
      student: {
        select: {
          nis: true,
          name: true,
          parentName: true,
          parentPhone: true,
        },
      },
      subscription: {
        select: { id: true, startDate: true, endDate: true, notes: true },
      },
      payments: {
        include: { employee: { select: { name: true } } },
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  if (!bill) {
    return errorResponse("Fee bill not found", "NOT_FOUND", 404);
  }

  return successResponse(bill);
}

async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  try {
    const existing = await prisma.feeBill.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Fee bill not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const { notes } = body as { notes?: string | null };

    const data: Record<string, unknown> = {};
    // Only notes are editable via PATCH. Status transitions happen through
    // the payment flow. Amount is a snapshot and must not change.
    if (notes !== undefined) {
      data.notes = notes;
    }

    // FeeBill doesn't currently have a notes column in the spec; if the
    // schema adds one, uncomment below. Otherwise this returns the bill
    // unchanged so callers can still PATCH safely.
    if (Object.keys(data).length === 0) {
      return successResponse(existing);
    }

    const updated = await prisma.feeBill.update({
      where: { id },
      data,
    });

    return successResponse(updated);
  } catch (error) {
    console.error("Update fee bill error:", error);
    return errorResponse("Failed to update fee bill", "SERVER_ERROR", 500);
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
    const bill = await prisma.feeBill.findUnique({
      where: { id },
      include: { _count: { select: { payments: true } } },
    });

    if (!bill) {
      return errorResponse("Fee bill not found", "NOT_FOUND", 404);
    }

    if (bill.status !== "UNPAID" || bill._count.payments > 0) {
      return errorResponse(
        "Cannot delete a bill with payments or non-UNPAID status",
        "CONFLICT",
        409,
      );
    }

    await prisma.feeBill.delete({ where: { id } });

    return successResponse({ message: "Fee bill deleted" });
  } catch (error) {
    console.error("Delete fee bill error:", error);
    return errorResponse("Failed to delete fee bill", "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET, PATCH, DELETE });
