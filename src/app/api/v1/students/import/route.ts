import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { readExcelBuffer } from "@/lib/excel-utils";
import { getServerT } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

interface StudentRow {
  NIS: string;
  NIK: string;
  "Student Name": string;
  Address: string;
  "Parent Name": string;
  "Parent Phone": string;
  "Start Join Date": string;
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  const t = await getServerT(request);
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return errorResponse(t("api.fileRequired"), "VALIDATION_ERROR", 400);
    }

    // Get current user for accountCreatedBy
    const createdBy = auth.employeeId;

    const buffer = await file.arrayBuffer();
    const { data, errors: readErrors } = readExcelBuffer<StudentRow>(buffer);

    if (readErrors.length > 0) {
      return errorResponse(readErrors.join(", "), "VALIDATION_ERROR", 400);
    }

    let imported = 0;
    let updated = 0;
    const errors: Array<{ row: number; nis: string; error: string }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

      if (!row.NIS || !row.NIK || !row["Student Name"]) {
        errors.push({
          row: rowNum,
          nis: row.NIS || "",
          error: t("api.missingRequiredFields"),
        });
        continue;
      }

      try {
        const existing = await prisma.student.findUnique({
          where: { nis: row.NIS },
        });

        if (existing) {
          await prisma.student.update({
            where: { nis: row.NIS },
            data: {
              nik: row.NIK,
              name: row["Student Name"],
              address: row.Address,
              parentName: row["Parent Name"],
              parentPhone: row["Parent Phone"],
              startJoinDate: new Date(row["Start Join Date"]),
            },
          });
          updated++;
        } else {
          // Normalize phone number and hash as default password
          const normalizedPassword = (row["Parent Phone"] || "").replace(
            /\D/g,
            "",
          );
          const hashedPassword = await bcrypt.hash(normalizedPassword, 10);

          await prisma.student.create({
            data: {
              nis: row.NIS,
              nik: row.NIK,
              name: row["Student Name"],
              address: row.Address,
              parentName: row["Parent Name"],
              parentPhone: row["Parent Phone"],
              startJoinDate: new Date(row["Start Join Date"]),
              // Auto-create account with default password
              hasAccount: true,
              password: hashedPassword,
              mustChangePassword: true,
              accountCreatedAt: new Date(),
              accountCreatedBy: createdBy,
            },
          });
          imported++;
        }
      } catch (err) {
        errors.push({
          row: rowNum,
          nis: row.NIS,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return successResponse({ imported, updated, errors });
  } catch (error) {
    console.error("Import students error:", error);
    return errorResponse(
      t("api.importFailed", { resource: "students" }),
      "SERVER_ERROR",
      500,
    );
  }
}
