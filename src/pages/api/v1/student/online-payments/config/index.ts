import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";
import { getClientKey, getSnapJsUrl } from "@/lib/midtrans";
import { prisma } from "@/lib/prisma";
import { getStudentSessionFromRequest } from "@/lib/student-auth";

async function GET(request: NextRequest) {
  const t = await getServerT(request);
  try {
    const session = await getStudentSessionFromRequest(request);
    if (!session) {
      return errorResponse(t("api.unauthorized"), "UNAUTHORIZED", 401);
    }

    const settings = await prisma.paymentSetting.findUnique({
      where: { id: "default" },
    });

    return successResponse({
      clientKey: getClientKey(),
      snapJsUrl: getSnapJsUrl(),
      enabled: settings?.onlinePaymentEnabled ?? true,
      maintenanceMessage: settings?.maintenanceMessage ?? null,
    });
  } catch (error) {
    console.error("Get payment config error:", error);
    return errorResponse(t("api.internalError"), "SERVER_ERROR", 500);
  }
}

export default createApiHandler({ GET });
