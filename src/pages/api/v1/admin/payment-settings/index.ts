import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { paymentSettingSchema } from "@/lib/validations/schemas/online-payment.schema";

async function GET(request: NextRequest) {
  const t = await getServerT(request);
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  try {
    let settings = await prisma.paymentSetting.findUnique({
      where: { id: "default" },
    });

    // Create default settings if not exist
    if (!settings) {
      settings = await prisma.paymentSetting.create({
        data: { id: "default", onlinePaymentEnabled: true },
      });
    }

    return successResponse({ settings });
  } catch (error) {
    console.error("Get payment settings error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

async function PUT(request: NextRequest) {
  const t = await getServerT(request);
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const parsed = paymentSettingSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        t("api.validationError"),
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const settings = await prisma.paymentSetting.upsert({
      where: { id: "default" },
      update: {
        onlinePaymentEnabled: parsed.data.onlinePaymentEnabled,
        maintenanceMessage: parsed.data.maintenanceMessage ?? null,
        updatedBy: auth.employeeId,
      },
      create: {
        id: "default",
        onlinePaymentEnabled: parsed.data.onlinePaymentEnabled,
        maintenanceMessage: parsed.data.maintenanceMessage ?? null,
        updatedBy: auth.employeeId,
      },
    });

    return successResponse({ settings });
  } catch (error) {
    console.error("Update payment settings error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET, PUT });
