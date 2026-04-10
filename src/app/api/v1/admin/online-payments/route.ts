import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const t = await getServerT(request);
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderId: { contains: search, mode: "insensitive" } },
        { student: { name: { contains: search, mode: "insensitive" } } },
        { student: { nis: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.onlinePayment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          student: { select: { nis: true, name: true } },
          items: {
            include: {
              tuition: {
                select: {
                  period: true,
                  year: true,
                  classAcademic: { select: { className: true } },
                },
              },
            },
          },
        },
      }),
      prisma.onlinePayment.count({ where }),
    ]);

    return successResponse({
      payments,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    });
  } catch (error) {
    console.error("Admin get online payments error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
