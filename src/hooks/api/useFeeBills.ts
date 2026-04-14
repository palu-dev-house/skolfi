"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaymentStatus } from "@/generated/prisma/client";
import { apiClient } from "@/lib/api-client";
import { type FeeBillFilters, queryKeys } from "@/lib/query-keys";

export interface FeeBill {
  id: string;
  feeServiceId: string;
  studentNis: string;
  period: string;
  year: number;
  amount: string;
  paidAmount: string;
  status: PaymentStatus;
  dueDate: string;
  voidedByExit: boolean;
  notes: string | null;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
  student?: { nis: string; name: string };
  feeService?: {
    id: string;
    name: string;
    category: "TRANSPORT" | "ACCOMMODATION";
    academicYear?: { year: string };
  };
  _count?: { payments: number };
}

interface FeeBillListResponse {
  success: boolean;
  data: {
    feeBills: FeeBill[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface FeeBillResponse {
  success: boolean;
  data: FeeBill;
}

interface GenerateFeeBillsResponse {
  success: boolean;
  data: {
    generated: number;
    skipped: number;
    details: {
      feeServiceId?: string;
      period: string;
      year: number;
      subscribers: number;
    };
  };
}

interface GenerateAllFeeBillsResponse {
  success: boolean;
  data: {
    created: number;
    skipped: number;
    exitSkipped: number;
    priceWarnings: string[];
  };
}

export function useFeeBills(filters: FeeBillFilters = {}) {
  return useQuery({
    queryKey: queryKeys.feeBills.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<FeeBillListResponse>("/fee-bills", {
        params: filters as Record<
          string,
          string | number | boolean | undefined
        >,
      });
      return data.data;
    },
  });
}

export function useFeeBill(id: string) {
  return useQuery({
    queryKey: queryKeys.feeBills.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<FeeBillResponse>(`/fee-bills/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useDeleteFeeBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/fee-bills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.feeBills.lists(),
      });
    },
  });
}

export function useGenerateFeeBills() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      feeServiceId: string;
      period: string;
      year: number;
    }) => {
      const { data } = await apiClient.post<GenerateFeeBillsResponse>(
        "/fee-bills/generate",
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feeBills.lists() });
    },
  });
}

export function useGenerateAllFeeBills() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { academicYearId?: string }) => {
      const { data } = await apiClient.post<GenerateAllFeeBillsResponse>(
        "/fee-bills/generate-all",
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feeBills.lists() });
    },
  });
}
