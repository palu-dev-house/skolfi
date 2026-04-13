import type { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { requireAuth } from "@/lib/api-auth";
import { successResponse } from "@/lib/api-response";

async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  return successResponse(
    {
      employeeId: auth.employeeId,
      name: auth.name,
      email: auth.email,
      role: auth.role,
    },
    undefined,
    "max-age=518400, must-revalidate",
  );
}

export default createApiHandler({ GET });
