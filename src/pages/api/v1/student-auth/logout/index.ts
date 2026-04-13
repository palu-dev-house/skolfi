import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { successResponse } from "@/lib/api-response";
import { getServerT } from "@/lib/i18n-server";

async function POST(request: NextRequest) {
  const t = await getServerT(request);
  const response = successResponse({ message: t("api.logoutSuccess") });

  response.headers.set(
    "Set-Cookie",
    "student-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  );

  return response;
}

export default createApiHandler({ POST });
