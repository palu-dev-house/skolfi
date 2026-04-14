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

  const bill = await prisma.serviceFeeBill.findUnique({
    where: { id },
    include: {
      serviceFee: {
        select: { id: true, name: true, amount: true },
      },
      student: {
        select: {
          nis: true,
          name: true,
          parentName: true,
          parentPhone: true,
        },
      },
      classAcademic: {
        select: {
          id: true,
          className: true,
          grade: true,
          section: true,
          academicYear: { select: { id: true, year: true } },
        },
      },
      payments: {
        include: { employee: { select: { name: true } } },
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  if (!bill) {
    return errorResponse("Service fee bill not found", "NOT_FOUND", 404);
  }

  return successResponse(bill);
}

async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  try {
    const bill = await prisma.serviceFeeBill.findUnique({
      where: { id },
      include: { _count: { select: { payments: true } } },
    });

    if (!bill) {
      return errorResponse("Service fee bill not found", "NOT_FOUND", 404);
    }

    if (bill.status !== "UNPAID" || bill._count.payments > 0) {
      return errorResponse(
        "Cannot delete a bill with payments or non-UNPAID status",
        "CONFLICT",
        409,
      );
    }

    await prisma.serviceFeeBill.delete({ where: { id } });

    return successResponse({ message: "Service fee bill deleted" });
  } catch (error) {
    console.error("Delete service fee bill error:", error);
    return errorResponse(
      "Failed to delete service fee bill",
      "SERVER_ERROR",
      500,
    );
  }
}

export default createApiHandler({ GET, DELETE });
