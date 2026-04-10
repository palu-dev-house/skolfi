"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { OnlinePaymentFilters } from "@/lib/query-keys";
import { queryKeys } from "@/lib/query-keys";

export interface AdminOnlinePayment {
  id: string;
  orderId: string;
  grossAmount: string;
  bank: string | null;
  vaNumber: string | null;
  paymentType: string | null;
  status: "PENDING" | "SETTLEMENT" | "EXPIRE" | "CANCEL" | "DENY" | "FAILURE";
  createdAt: string;
  settlementTime: string | null;
  expiryTime: string | null;
  student: { nis: string; name: string };
  items: Array<{
    id: string;
    amount: string;
    tuition: {
      period: string;
      year: number;
      classAcademic: { className: string };
    };
  }>;
}

interface AdminOnlinePaymentsResponse {
  success: boolean;
  data: {
    payments: AdminOnlinePayment[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

interface PaymentSettingsResponse {
  success: boolean;
  data: {
    settings: {
      id: string;
      onlinePaymentEnabled: boolean;
      maintenanceMessage: string | null;
      updatedAt: string;
      updatedBy: string | null;
    };
  };
}

export function useAdminOnlinePayments(filters: OnlinePaymentFilters) {
  return useQuery({
    queryKey: queryKeys.adminOnlinePayments.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<AdminOnlinePaymentsResponse>(
        "/admin/online-payments",
        {
          params: filters as Record<
            string,
            string | number | boolean | undefined
          >,
        },
      );
      return data.data;
    },
  });
}

export function usePaymentSettings() {
  return useQuery({
    queryKey: queryKeys.paymentSettings.all,
    queryFn: async () => {
      const { data } = await apiClient.get<PaymentSettingsResponse>(
        "/admin/payment-settings",
      );
      return data.data.settings;
    },
  });
}

export function useUpdatePaymentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      onlinePaymentEnabled: boolean;
      maintenanceMessage?: string | null;
    }) => {
      const { data } = await apiClient.put<PaymentSettingsResponse>(
        "/admin/payment-settings",
        input,
      );
      return data.data.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentSettings.all,
      });
    },
  });
}
