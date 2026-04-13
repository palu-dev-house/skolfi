"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface PrintPayment {
  id: string;
  amount: string;
  scholarshipAmount: string;
  paymentDate: string;
  notes: string | null;
  tuition: {
    id: string;
    period: string;
    year: number;
    feeAmount: string;
    scholarshipAmount: string;
    discountAmount: string;
    paidAmount: string;
    status: string;
    student: {
      nis: string;
      name: string;
      parentName: string;
    };
    classAcademic: {
      className: string;
      academicYear: { year: string };
    };
  };
  employee: {
    name: string;
  } | null;
}

interface PrintPaymentsResponse {
  success: boolean;
  data: {
    payments: PrintPayment[];
  };
}

export function usePrintPayments(params: {
  academicYearId?: string;
  mode: "today" | "all";
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["payments", "print", params.academicYearId, params.mode],
    queryFn: async () => {
      const { data } = await apiClient.get<PrintPaymentsResponse>(
        "/payments/print",
        {
          params: {
            academicYearId: params.academicYearId,
            mode: params.mode,
          },
        },
      );
      return data.data.payments;
    },
    enabled: params.enabled !== false,
  });
}
