import { jwtVerify, SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.STUDENT_JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "default-secret-change-in-production",
);

export interface StudentJwtPayload {
  studentId: string;
  studentName: string;
  type: "student";
}

export async function signStudentToken(
  payload: Omit<StudentJwtPayload, "type">,
): Promise<string> {
  return new SignJWT({ ...payload, type: "student" } as unknown as Record<
    string,
    unknown
  >)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyStudentToken(
  token: string,
): Promise<StudentJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if ((payload as { type?: string }).type !== "student") {
      return null;
    }
    return payload as unknown as StudentJwtPayload;
  } catch {
    return null;
  }
}

export function getStudentTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((c) => c.split("=")),
    );
    return cookies["student-token"] || null;
  }

  return null;
}

export async function getStudentSessionFromRequest(
  request: Request,
): Promise<StudentJwtPayload | null> {
  const token = getStudentTokenFromRequest(request);
  if (!token) return null;
  return verifyStudentToken(token);
}
