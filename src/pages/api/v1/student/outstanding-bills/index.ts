import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { getStudentSessionFromRequest } from "@/lib/student-auth";

async function GET(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const session = await getStudentSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    const nis = session.studentNis;

    const [tuitions, feeBills, serviceFeeBills] = await Promise.all([
      prisma.tuition.findMany({
        where: {
          studentNis: nis,
          status: { in: ["UNPAID", "PARTIAL"] },
        },
        include: {
          classAcademic: {
            select: {
              className: true,
              academicYear: { select: { year: true } },
            },
          },
        },
        orderBy: [{ year: "asc" }, { period: "asc" }],
      }),
      prisma.feeBill.findMany({
        where: {
          studentNis: nis,
          status: { in: ["UNPAID", "PARTIAL"] },
          voidedByExit: false,
        },
        include: {
          feeService: { select: { name: true, category: true } },
        },
        orderBy: [{ year: "asc" }, { period: "asc" }],
      }),
      prisma.serviceFeeBill.findMany({
        where: {
          studentNis: nis,
          status: { in: ["UNPAID", "PARTIAL"] },
          voidedByExit: false,
        },
        include: {
          serviceFee: { select: { name: true } },
        },
        orderBy: [{ year: "asc" }, { period: "asc" }],
      }),
    ]);

    const mapTuition = (x: (typeof tuitions)[number]) => {
      const remaining =
        Number(x.feeAmount) -
        Number(x.paidAmount) -
        Number(x.scholarshipAmount) -
        Number(x.discountAmount);
      return {
        kind: "tuition" as const,
        id: x.id,
        label: `SPP - ${x.classAcademic.className}`,
        period: x.period,
        year: x.year,
        dueDate: x.dueDate,
        amount: Number(x.feeAmount),
        paidAmount: Number(x.paidAmount),
        scholarshipAmount: Number(x.scholarshipAmount),
        discountAmount: Number(x.discountAmount),
        remainingAmount: remaining,
        status: x.status,
      };
    };

    const mapFeeBill = (b: (typeof feeBills)[number]) => ({
      kind: "feeBill" as const,
      id: b.id,
      label: b.feeService.name,
      category: b.feeService.category,
      period: b.period,
      year: b.year,
      dueDate: b.dueDate,
      amount: Number(b.amount),
      paidAmount: Number(b.paidAmount),
      remainingAmount: Number(b.amount) - Number(b.paidAmount),
      status: b.status,
    });

    const mapServiceFeeBill = (b: (typeof serviceFeeBills)[number]) => ({
      kind: "serviceFeeBill" as const,
      id: b.id,
      label: b.serviceFee.name,
      period: b.period,
      year: b.year,
      dueDate: b.dueDate,
      amount: Number(b.amount),
      paidAmount: Number(b.paidAmount),
      remainingAmount: Number(b.amount) - Number(b.paidAmount),
      status: b.status,
    });

    return successResponse({
      tuitions: tuitions.map(mapTuition),
      feeBills: feeBills.map(mapFeeBill),
      serviceFeeBills: serviceFeeBills.map(mapServiceFeeBill),
    });
  } catch (error) {
    console.error("Get outstanding bills error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET });
