"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Month, PaymentStatus } from "@/generated/prisma/client";
import { apiClient } from "@/lib/api-client";
import { type PaymentFilters, queryKeys } from "@/lib/query-keys";

interface Payment {
  id: string;
  tuitionId: string;
  employeeId: string;
  amount: string;
  scholarshipAmount: string;
  paymentDate: string;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  tuition?: {
    id: string;
    classAcademicId: string;
    studentNis: string;
    period: string;
    month: Month;
    year: number;
    feeAmount: string;
    scholarshipAmount: string;
    discountAmount: string;
    discountId: string;
    paidAmount: string;
    status: string;
    dueDate: string;
    generatedAt: string;
    createdAt: string;
    updatedAt: string;
    student?: {
      nis: string;
      name: string;
    };
    classAcademic?: {
      className: string;
    };
    discount?: {
      name: string;
      reason: string;
      description: string | null;
    };
  };
  employee?: {
    employeeId: string;
    name: string;
  };
}

interface PaymentListResponse {
  success: boolean;
  data: {
    payments: Payment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface PaymentResponse {
  success: boolean;
  data: {
    payment: Payment;
    result: {
      previousStatus: PaymentStatus;
      newStatus: PaymentStatus;
      previousPaidAmount: number;
      newPaidAmount: number;
      remainingAmount: number;
      feeAmount: number;
      scholarshipAmount: number;
      discountAmount: number;
      effectiveFeeAmount: number;
    };
  };
}

export function usePayments(filters: PaymentFilters = {}) {
  return useQuery({
    queryKey: queryKeys.payments.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<PaymentListResponse>("/payments", {
        params: filters as Record<
          string,
          string | number | boolean | undefined
        >,
      });
      return data.data;
    },
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: queryKeys.payments.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: Payment }>(
        `/payments/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: {
      tuitionId: string;
      amount: number;
      notes?: string;
    }) => {
      const { data } = await apiClient.post<PaymentResponse>(
        "/payments",
        payment,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tuitions.lists(),
      });
    },
  });
}

export function useBulkReversePayments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await apiClient.post<{
        success: boolean;
        data: { reversed: number };
      }>("/payments/bulk-reverse", { ids });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tuitions.lists(),
      });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tuitions.lists(),
      });
    },
  });
}
