import type { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { applyFeeBillPayment } from "@/lib/business-logic/fee-bills";
import { assertSingleBillTarget } from "@/lib/business-logic/payment-items";
import { processPayment } from "@/lib/business-logic/payment-processor";
import { applyServiceFeeBillPayment } from "@/lib/business-logic/service-fee-bills";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { paymentSchema } from "@/lib/validations";
import { parseWithLocale } from "@/lib/validations/parse-with-locale";

async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");
  const studentId = searchParams.get("studentId") || undefined;
  const classAcademicId = searchParams.get("classAcademicId") || undefined;
  const employeeId = searchParams.get("employeeId") || undefined;
  const paymentDateFrom = searchParams.get("paymentDateFrom") || undefined;
  const paymentDateTo = searchParams.get("paymentDateTo") || undefined;

  const where: Prisma.PaymentWhereInput = {};

  if (employeeId) {
    where.employeeId = employeeId;
  }

  if (paymentDateFrom || paymentDateTo) {
    where.paymentDate = {};
    if (paymentDateFrom) {
      where.paymentDate.gte = new Date(paymentDateFrom);
    }
    if (paymentDateTo) {
      where.paymentDate.lte = new Date(paymentDateTo);
    }
  }

  if (studentId) {
    where.OR = [
      { tuition: { studentId } },
      { feeBill: { studentId } },
      { serviceFeeBill: { studentId } },
    ];
  }

  if (classAcademicId) {
    const classFilter: Prisma.PaymentWhereInput = {
      OR: [
        { tuition: { classAcademicId } },
        { serviceFeeBill: { classAcademicId } },
        {
          feeBill: {
            student: {
              studentClasses: { some: { classAcademicId } },
            },
          },
        },
      ],
    };
    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), classFilter];
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        tuition: {
          include: {
            student: { select: { nis: true, name: true } },
            classAcademic: { select: { className: true } },
            discount: {
              select: { name: true, reason: true, description: true },
            },
          },
        },
        feeBill: {
          include: {
            feeService: { select: { id: true, name: true, category: true } },
            student: {
              select: {
                nis: true,
                name: true,
                studentClasses: {
                  take: 1,
                  orderBy: { enrolledAt: "desc" },
                  include: {
                    classAcademic: { select: { className: true } },
                  },
                },
              },
            },
          },
        },
        serviceFeeBill: {
          include: {
            serviceFee: { select: { id: true, name: true } },
            student: { select: { nis: true, name: true } },
            classAcademic: { select: { className: true } },
          },
        },
        employee: { select: { employeeId: true, name: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { paymentDate: "desc" },
    }),
    prisma.payment.count({ where }),
  ]);

  return successResponse({
    payments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const body = await request.json();
    const parsed = await parseWithLocale(paymentSchema, body, request);
    if (!parsed.success) return parsed.response;

    const { studentId, paymentDate, notes, items } = parsed.data;

    // Invariant check (belt + suspenders over the zod superRefine)
    for (const item of items) {
      assertSingleBillTarget({
        tuitionId: item.tuitionId ?? null,
        feeBillId: item.feeBillId ?? null,
        serviceFeeBillId: item.serviceFeeBillId ?? null,
      });
    }

    // Verify each bill exists & belongs to the student before opening the tx
    const tuitionIds = items
      .map((i) => i.tuitionId)
      .filter(Boolean) as string[];
    const feeBillIds = items
      .map((i) => i.feeBillId)
      .filter(Boolean) as string[];
    const serviceFeeBillIds = items
      .map((i) => i.serviceFeeBillId)
      .filter(Boolean) as string[];

    const [tuitions, feeBills, serviceFeeBills] = await Promise.all([
      tuitionIds.length
        ? prisma.tuition.findMany({ where: { id: { in: tuitionIds } } })
        : Promise.resolve([]),
      feeBillIds.length
        ? prisma.feeBill.findMany({ where: { id: { in: feeBillIds } } })
        : Promise.resolve([]),
      serviceFeeBillIds.length
        ? prisma.serviceFeeBill.findMany({
            where: { id: { in: serviceFeeBillIds } },
          })
        : Promise.resolve([]),
    ]);

    const tuitionMap = new Map(tuitions.map((x) => [x.id, x]));
    const feeBillMap = new Map(feeBills.map((x) => [x.id, x]));
    const serviceFeeBillMap = new Map(serviceFeeBills.map((x) => [x.id, x]));

    for (const item of items) {
      if (item.tuitionId) {
        const row = tuitionMap.get(item.tuitionId);
        if (!row)
          return errorResponse(
            t("api.notFound", { resource: "Tuition" }),
            "NOT_FOUND",
            404,
          );
        if (row.studentId !== studentId)
          return errorResponse(
            "Bill does not belong to student",
            "VALIDATION_ERROR",
            400,
          );
        if (row.status === "PAID")
          return errorResponse(
            t("api.tuitionFullyPaid"),
            "VALIDATION_ERROR",
            400,
          );
      } else if (item.feeBillId) {
        const row = feeBillMap.get(item.feeBillId);
        if (!row)
          return errorResponse(
            t("api.notFound", { resource: "FeeBill" }),
            "NOT_FOUND",
            404,
          );
        if (row.studentId !== studentId)
          return errorResponse(
            "Bill does not belong to student",
            "VALIDATION_ERROR",
            400,
          );
        if (row.status === "PAID")
          return errorResponse(
            "Fee bill already fully paid",
            "VALIDATION_ERROR",
            400,
          );
      } else if (item.serviceFeeBillId) {
        const row = serviceFeeBillMap.get(item.serviceFeeBillId);
        if (!row)
          return errorResponse(
            t("api.notFound", { resource: "ServiceFeeBill" }),
            "NOT_FOUND",
            404,
          );
        if (row.studentId !== studentId)
          return errorResponse(
            "Bill does not belong to student",
            "VALIDATION_ERROR",
            400,
          );
        if (row.status === "PAID")
          return errorResponse(
            "Service fee bill already fully paid",
            "VALIDATION_ERROR",
            400,
          );
      }
    }

    const transactionId = crypto.randomUUID();
    const paymentDateValue = paymentDate ? new Date(paymentDate) : new Date();

    const createdPayments = await prisma.$transaction(async (tx) => {
      const results: Array<{ id: string }> = [];

      for (const item of items) {
        const amountDec = new Prisma.Decimal(item.amount);

        if (item.tuitionId) {
          // Delegate to existing tuition processor for discount/scholarship math.
          const res = await processPayment(
            {
              tuitionId: item.tuitionId,
              amount: Number(amountDec),
              employeeId: auth.employeeId,
              notes,
            },
            tx,
          );
          // Stamp transactionId + paymentDate after processPayment created the row.
          await tx.payment.update({
            where: { id: res.paymentId },
            data: { transactionId, paymentDate: paymentDateValue },
          });
          results.push({ id: res.paymentId });
        } else if (item.feeBillId) {
          const payment = await tx.payment.create({
            data: {
              feeBillId: item.feeBillId,
              employeeId: auth.employeeId,
              amount: amountDec,
              scholarshipAmount: new Prisma.Decimal(0),
              paymentDate: paymentDateValue,
              notes,
              transactionId,
            },
          });
          await applyFeeBillPayment(tx, item.feeBillId, amountDec);
          results.push({ id: payment.id });
        } else if (item.serviceFeeBillId) {
          const payment = await tx.payment.create({
            data: {
              serviceFeeBillId: item.serviceFeeBillId,
              employeeId: auth.employeeId,
              amount: amountDec,
              scholarshipAmount: new Prisma.Decimal(0),
              paymentDate: paymentDateValue,
              notes,
              transactionId,
            },
          });
          await applyServiceFeeBillPayment(
            tx,
            item.serviceFeeBillId,
            amountDec,
          );
          results.push({ id: payment.id });
        }
      }

      return results;
    });

    const payments = await prisma.payment.findMany({
      where: { id: { in: createdPayments.map((p) => p.id) } },
      include: {
        tuition: {
          include: {
            student: { select: { nis: true, name: true } },
            classAcademic: { select: { className: true } },
            discount: {
              select: {
                name: true,
                reason: true,
                description: true,
                targetPeriods: true,
              },
            },
          },
        },
        feeBill: {
          include: {
            feeService: { select: { id: true, name: true, category: true } },
            student: { select: { nis: true, name: true } },
          },
        },
        serviceFeeBill: {
          include: {
            serviceFee: { select: { id: true, name: true } },
            student: { select: { nis: true, name: true } },
            classAcademic: { select: { className: true } },
          },
        },
        employee: { select: { employeeId: true, name: true } },
      },
    });

    return successResponse({ transactionId, payments }, 201);
  } catch (error) {
    console.error("Create payment error:", error);
    if (error instanceof Error) {
      return errorResponse(error.message, "VALIDATION_ERROR", 400);
    }
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET, POST });
