import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { studentSchema } from "@/lib/validations";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || undefined;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { nis: { contains: search, mode: "insensitive" } },
      { nik: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.student.count({ where }),
  ]);

  return successResponse({
    students,
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
    const parsed = await parseWithLocale(studentSchema, body, request);
    if (!parsed.success) return parsed.response;

    const { nis, nik, name, address, parentName, parentPhone, startJoinDate } = parsed.data;

    const existingNis = await prisma.student.findUnique({ where: { nis } });
    if (existingNis) {
      return errorResponse(t("api.alreadyExists", { resource: "NIS" }), "DUPLICATE_ENTRY", 409);
    }

    const existingNik = await prisma.student.findUnique({ where: { nik } });
    if (existingNik) {
      return errorResponse(t("api.alreadyExists", { resource: "NIK" }), "DUPLICATE_ENTRY", 409);
    }

    // Get current user for accountCreatedBy
    const createdBy = auth.employeeId;

    // Normalize phone number and hash as default password
    const normalizedPassword = parentPhone.replace(/\D/g, "");
    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);

    const student = await prisma.student.create({
      data: {
        nis,
        nik,
        name,
        address,
        parentName,
        parentPhone,
        startJoinDate,
        // Auto-create account with default password
        hasAccount: true,
        password: hashedPassword,
        mustChangePassword: true,
        accountCreatedAt: new Date(),
        accountCreatedBy: createdBy,
      },
    });

    return successResponse(student, 201);
  } catch (error) {
    console.error("Create student error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}
