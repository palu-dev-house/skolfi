import type { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth } from "@/lib/api-auth";
import { successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");
  const studentSearch = searchParams.get("studentId") || undefined;
  const feeServiceId = searchParams.get("feeServiceId") || undefined;
  const schoolLevelParam = searchParams.get("schoolLevel");
  const schoolLevel =
    schoolLevelParam && schoolLevelParam !== "null"
      ? (schoolLevelParam as "TK" | "SD" | "SMP" | "SMA")
      : undefined;
  const periodParam = searchParams.get("period");
  const period =
    periodParam && periodParam !== "null" ? periodParam : undefined;
  const year = searchParams.get("year")
    ? Number(searchParams.get("year"))
    : undefined;
  const statusParam = searchParams.get("status");
  const status =
    statusParam && statusParam !== "null" ? statusParam : undefined;

  const where: Prisma.FeeBillWhereInput = {};
  const isUuid =
    !!studentSearch &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      studentSearch,
    );
  if (isUuid) {
    where.studentId = studentSearch as string;
    if (schoolLevel) where.student = { schoolLevel };
  } else if (studentSearch || schoolLevel) {
    where.student = {
      ...(studentSearch && {
        OR: [
          { nis: { contains: studentSearch, mode: "insensitive" } },
          { name: { contains: studentSearch, mode: "insensitive" } },
        ],
      }),
      ...(schoolLevel && { schoolLevel }),
    };
  }
  if (feeServiceId) where.feeServiceId = feeServiceId;
  if (period) where.period = period;
  if (year) where.year = year;
  if (status) {
    where.status = status as "UNPAID" | "PAID" | "PARTIAL" | "VOID";
  }

  const [bills, total] = await Promise.all([
    prisma.feeBill.findMany({
      where,
      include: {
        feeService: {
          select: { id: true, name: true, category: true },
        },
        student: {
          select: {
            nis: true,
            schoolLevel: true,
            name: true,
            parentPhone: true,
          },
        },
        _count: { select: { payments: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        { year: "desc" },
        { period: "desc" },
        { student: { name: "asc" } },
      ],
    }),
    prisma.feeBill.count({ where }),
  ]);

  return successResponse({
    feeBills: bills,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export default createApiHandler({ GET });
