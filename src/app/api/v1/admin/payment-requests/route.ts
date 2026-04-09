import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const search = searchParams.get("search") || undefined;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { student: { name: { contains: search, mode: "insensitive" } } },
        { student: { nis: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [paymentRequests, total] = await Promise.all([
      prisma.paymentRequest.findMany({
        where,
        include: {
          student: {
            select: {
              nis: true,
              name: true,
              parentName: true,
              parentPhone: true,
            },
          },
          tuitions: {
            include: {
              tuition: {
                select: {
                  period: true,
                  year: true,
                },
              },
            },
          },
          bankAccount: {
            select: {
              id: true,
              bankName: true,
              accountNumber: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.paymentRequest.count({ where }),
    ]);

    return successResponse({
      paymentRequests: paymentRequests.map((pr) => ({
        id: pr.id,
        status: pr.status,
        totalAmount: pr.totalAmount.toString(),
        baseAmount: pr.baseAmount.toString(),
        uniqueCode: pr.uniqueCode,
        expiresAt: pr.expiresAt.toISOString(),
        verifiedAt: pr.verifiedAt?.toISOString() || null,
        createdAt: pr.createdAt.toISOString(),
        student: pr.student,
        tuitions: pr.tuitions.map((t) => ({
          period: t.tuition.period,
          year: t.tuition.year,
          amount: t.amount.toString(),
        })),
        bankAccount: pr.bankAccount,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get payment requests error:", error);
    return errorResponse(t("api.internalError"), "INTERNAL_ERROR", 500);
  }
}
