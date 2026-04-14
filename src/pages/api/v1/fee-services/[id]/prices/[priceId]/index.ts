import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; priceId: string }> },
) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const { id, priceId } = await params;

  try {
    const price = await prisma.feeServicePrice.findUnique({
      where: { id: priceId },
    });
    if (!price || price.feeServiceId !== id) {
      return errorResponse("Price not found", "NOT_FOUND", 404);
    }

    const referencedCount = await prisma.feeBill.count({
      where: {
        feeServiceId: id,
        generatedAt: { gte: price.effectiveFrom },
      },
    });

    if (referencedCount > 0) {
      return errorResponse(
        "Cannot delete a price entry that has been used to generate bills",
        "CONFLICT",
        409,
      );
    }

    await prisma.feeServicePrice.delete({ where: { id: priceId } });

    return successResponse({ message: "Price entry deleted" });
  } catch (error) {
    console.error("Delete fee service price error:", error);
    return errorResponse("Failed to delete price entry", "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ DELETE });
