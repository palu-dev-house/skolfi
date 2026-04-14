"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { studentApiClient } from "@/lib/student-api-client";

export type OutstandingBillKind = "tuition" | "feeBill" | "serviceFeeBill";

export interface OutstandingBill {
  kind: OutstandingBillKind;
  id: string;
  label: string;
  category?: "TRANSPORT" | "ACCOMMODATION";
  period: string;
  year: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  scholarshipAmount?: number;
  discountAmount?: number;
  remainingAmount: number;
  status: "UNPAID" | "PARTIAL" | "PAID" | "VOID";
}

interface OutstandingResponse {
  success: boolean;
  data: {
    tuitions: OutstandingBill[];
    feeBills: OutstandingBill[];
    serviceFeeBills: OutstandingBill[];
  };
}

export function usePortalOutstanding() {
  return useQuery({
    queryKey: queryKeys.studentOutstanding.list(),
    queryFn: async () => {
      const { data } = await studentApiClient.get<OutstandingResponse>(
        "/student/outstanding-bills",
      );
      return data.data;
    },
  });
}
