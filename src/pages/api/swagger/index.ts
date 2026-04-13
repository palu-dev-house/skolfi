import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-adapter";
import { getApiDocs } from "@/lib/swagger";

async function GET() {
  const spec = getApiDocs();
  return NextResponse.json(spec);
}

export default createApiHandler({ GET });
