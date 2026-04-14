"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Month } from "@/generated/prisma/client";
import { apiClient } from "@/lib/api-client";
import { type PaymentFilters, queryKeys } from "@/lib/query-keys";

interface Payment {
  id: string;
  tuitionId: string | null;
  feeBillId: string | null;
  serviceFeeBillId: string | null;
  transactionId: string | null;
  employeeId: string | null;
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
  } | null;
  feeBill?: {
    id: string;
    period: string;
    year: number;
    feeService?: {
      id: string;
      name: string;
      category: "TRANSPORT" | "ACCOMMODATION";
    };
  } | null;
  serviceFeeBill?: {
    id: string;
    period: string;
    year: number;
    serviceFee?: { id: string; name: string };
  } | null;
  employee?: {
    employeeId: string;
    name: string;
  } | null;
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

interface PaymentItemPayload {
  tuitionId?: string;
  feeBillId?: string;
  serviceFeeBillId?: string;
  amount: string;
  scholarshipAmount?: string;
}

interface CreatePaymentPayload {
  studentNis: string;
  paymentDate?: string;
  notes?: string;
  items: PaymentItemPayload[];
}

interface CreatePaymentResponse {
  success: boolean;
  data: {
    transactionId: string;
    payments: Payment[];
  };
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePaymentPayload) => {
      const { data } = await apiClient.post<CreatePaymentResponse>(
        "/payments",
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tuitions.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.feeBills.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.serviceFeeBills.lists(),
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
