import type { NextRequest } from "next/server";
import type { PaymentStatus } from "@/generated/prisma/client";
import { createApiHandler } from "@/lib/api-adapter";
import { requireRole } from "@/lib/api-auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/v1/tuitions/sync-scholarships
 * Recalculates and syncs scholarship amounts for UNPAID/PARTIAL tuitions only.
 * Already PAID tuitions are not affected by scholarships (no retroactive redemption).
 */
async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["ADMIN"]);
  if (auth instanceof Response) return auth;

  try {
    // Only get UNPAID and PARTIAL tuitions - PAID tuitions should not be affected
    const tuitions = await prisma.tuition.findMany({
      where: {
        status: { in: ["UNPAID", "PARTIAL"] },
      },
      select: {
        id: true,
        studentNis: true,
        classAcademicId: true,
        feeAmount: true,
        paidAmount: true,
        scholarshipAmount: true,
        status: true,
        discountAmount: true,
      },
    });

    // Get all scholarships grouped by student+class
    const scholarships = await prisma.scholarship.findMany();
    const scholarshipMap = new Map<string, number>();

    for (const s of scholarships) {
      const key = `${s.studentNis}-${s.classAcademicId}`;
      const current = scholarshipMap.get(key) || 0;
      scholarshipMap.set(key, current + Number(s.nominal));
    }

    let updated = 0;
    let statusChanged = 0;
    const _skippedPaid = 0;

    for (const tuition of tuitions) {
      const key = `${tuition.studentNis}-${tuition.classAcademicId}`;
      const totalScholarship = scholarshipMap.get(key) || 0;
      const currentScholarship = Number(tuition.scholarshipAmount);

      // Check if scholarship amount changed
      if (totalScholarship !== currentScholarship) {
        const feeAmount = Number(tuition.feeAmount);
        const paidAmount = Number(tuition.paidAmount);
        const discountAmount = Number(tuition.discountAmount);
        const effectiveFee = Math.max(
          feeAmount - totalScholarship - discountAmount,
          0,
        );

        // Determine correct status
        let newStatus: PaymentStatus;
        if (paidAmount >= effectiveFee) {
          newStatus = "PAID";
        } else if (paidAmount > 0) {
          newStatus = "PARTIAL";
        } else {
          newStatus = "UNPAID";
        }

        const statusWillChange = newStatus !== tuition.status;

        await prisma.tuition.update({
          where: { id: tuition.id },
          data: {
            scholarshipAmount: totalScholarship,
            status: newStatus,
          },
        });

        updated++;
        if (statusWillChange) {
          statusChanged++;
        }
      }
    }

    // Count how many PAID tuitions were skipped
    const paidTuitionsCount = await prisma.tuition.count({
      where: { status: "PAID" },
    });

    return successResponse({
      message: "Scholarship amounts synced successfully",
      totalTuitions: tuitions.length,
      updated,
      statusChanged,
      skippedPaidTuitions: paidTuitionsCount,
      note: "Already PAID tuitions are not affected by scholarships (no retroactive redemption)",
    });
  } catch (error) {
    console.error("Error syncing scholarships:", error);
    return errorResponse(
      "Failed to sync scholarship amounts",
      "INTERNAL_ERROR",
      500,
    );
  }
}

export default createApiHandler({ POST });
