"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { studentApiClient } from "@/lib/student-api-client";

export interface StudentTuition {
  id: string;
  period: string;
  year: number;
  feeAmount: string;
  scholarshipAmount: string;
  discountAmount: string;
  paidAmount: string;
  status: "UNPAID" | "PARTIAL" | "PAID" | "VOID";
  dueDate: string;
  className: string;
  academicYear: string;
  remainingAmount: number;
  pendingPaymentId: string | null;
}

interface TuitionsResponse {
  success: boolean;
  data: {
    tuitions: StudentTuition[];
  };
}

export function useStudentTuitions() {
  return useQuery({
    queryKey: queryKeys.studentTuitions.list(),
    retryOnMount: false,
    queryFn: async () => {
      const { data } =
        await studentApiClient.get<TuitionsResponse>("/student/tuitions");
      return data.data.tuitions;
    },
    staleTime: (query) => {
      if (
        query.state.data?.every((tuition) => tuition.pendingPaymentId === null)
      ) {
        return Infinity;
      }
      return 0;
    },
  });
}
