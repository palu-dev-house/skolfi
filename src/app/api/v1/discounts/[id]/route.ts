import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { removeDiscountFromTuitions } from "@/lib/business-logic/discount-processor";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { id } = await params;

  const discount = await prisma.discount.findUnique({
    where: { id },
    include: {
      academicYear: {
        select: { id: true, year: true },
      },
      classAcademic: {
        select: {
          id: true,
          className: true,
          grade: true,
          section: true,
        },
      },
      _count: {
        select: { tuitions: true },
      },
    },
  });

  if (!discount) {
    return errorResponse(
      t("api.notFound", { resource: "Discount" }),
      "NOT_FOUND",
      404,
    );
  }

  // Get usage statistics
  const tuitionStats = await prisma.tuition.groupBy({
    by: ["status"],
    where: { discountId: id },
    _count: true,
  });

  const totalDiscountApplied = await prisma.tuition.aggregate({
    where: { discountId: id },
    _sum: { discountAmount: true },
  });

  // Build tuitionsByStatus without spread in reduce
  const tuitionsByStatus: Record<string, number> = {};
  for (const item of tuitionStats) {
    tuitionsByStatus[item.status] = item._count;
  }

  return successResponse({
    discount,
    stats: {
      tuitionsByStatus,
      totalTuitionsApplied: discount._count.tuitions,
      totalDiscountApplied:
        Number(totalDiscountApplied._sum.discountAmount) || 0,
    },
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { id } = await params;

  try {
    const body = await request.json();
    const {
      name,
      description,
      reason,
      discountAmount,
      targetPeriods,
      isActive,
    } = body;

    // Check if discount exists
    const existingDiscount = await prisma.discount.findUnique({
      where: { id },
    });

    if (!existingDiscount) {
      return errorResponse(
        t("api.notFound", { resource: "Discount" }),
        "NOT_FOUND",
        404,
      );
    }

    // Build update data
    const updateData: {
      name?: string;
      description?: string | null;
      reason?: string | null;
      discountAmount?: number;
      targetPeriods?: string[];
      isActive?: boolean;
    } = {};

    if (name !== undefined) {
      if (!name) {
        return errorResponse(t("api.requiredFields"), "VALIDATION_ERROR", 400);
      }
      updateData.name = name;
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (reason !== undefined) {
      updateData.reason = reason || null;
    }

    if (discountAmount !== undefined) {
      if (discountAmount <= 0) {
        return errorResponse(
          t("api.mustBePositive", { field: "Discount amount" }),
          "VALIDATION_ERROR",
          400,
        );
      }
      updateData.discountAmount = discountAmount;
    }

    if (targetPeriods !== undefined) {
      if (!Array.isArray(targetPeriods) || targetPeriods.length === 0) {
        return errorResponse(t("api.periodRequired"), "VALIDATION_ERROR", 400);
      }
      updateData.targetPeriods = targetPeriods;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Update discount
    const discount = await prisma.discount.update({
      where: { id },
      data: updateData,
      include: {
        academicYear: {
          select: { id: true, year: true },
        },
        classAcademic: {
          select: {
            id: true,
            className: true,
            grade: true,
            section: true,
          },
        },
        _count: {
          select: { tuitions: true },
        },
      },
    });

    return successResponse({ discount });
  } catch (error) {
    console.error("Update discount error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  const { id } = await params;

  try {
    // Check if discount exists
    const discount = await prisma.discount.findUnique({
      where: { id },
      include: {
        _count: { select: { tuitions: true } },
      },
    });

    if (!discount) {
      return errorResponse(
        t("api.notFound", { resource: "Discount" }),
        "NOT_FOUND",
        404,
      );
    }

    // Remove discount from all tuitions first
    const removedCount = await removeDiscountFromTuitions(id, prisma);

    // Delete the discount
    await prisma.discount.delete({
      where: { id },
    });

    return successResponse({
      message: t("api.deleteSuccess", { resource: "Discount" }),
      tuitionsAffected: removedCount,
    });
  } catch (error) {
    console.error("Delete discount error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
