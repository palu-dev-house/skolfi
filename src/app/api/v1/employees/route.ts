import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { employeeSchema } from "@/lib/validations";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || undefined;
  const role = searchParams.get("role") as "ADMIN" | "CASHIER" | null;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role) {
    where.role = role;
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      select: {
        employeeId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.count({ where }),
  ]);

  return successResponse({
    employees,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const body = await request.json();
    const parsed = await parseWithLocale(employeeSchema, body, request);
    if (!parsed.success) return parsed.response;

    const { name, email, role } = parsed.data;

    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) {
      return errorResponse(t("api.alreadyExists", { resource: "Email" }), "DUPLICATE_ENTRY", 409);
    }

    const hashedPassword = await bcrypt.hash("123456", 10);

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "CASHIER",
      },
      select: {
        employeeId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return successResponse(employee, 201);
  } catch (error) {
    console.error("Create employee error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
