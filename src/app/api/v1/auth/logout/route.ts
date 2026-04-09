import type { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";
import { getTokenFromRequest } from "@/lib/auth";
import { getServerT } from "@/lib/i18n-server";
import { blacklistToken } from "@/lib/token-blacklist";

export async function POST(request: NextRequest) {
  const t = await getServerT(request);
  const token = getTokenFromRequest(request);

  if (token) {
    blacklistToken(token);
  }

  const response = successResponse({ message: t("api.logoutSuccess") });

  response.headers.set(
    "Set-Cookie",
    "auth-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  );

  return response;
}
