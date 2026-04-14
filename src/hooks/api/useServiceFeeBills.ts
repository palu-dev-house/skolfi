"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaymentStatus } from "@/generated/prisma/client";
import { apiClient } from "@/lib/api-client";
import { queryKeys, type ServiceFeeBillFilters } from "@/lib/query-keys";

export interface ServiceFeeBill {
  id: string;
  serviceFeeId: string;
  classAcademicId: string;
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
  serviceFee?: { id: string; name: string };
  classAcademic?: {
    id: string;
    className: string;
    academicYear?: { year: string };
  };
  _count?: { payments: number };
}

interface ServiceFeeBillListResponse {
  success: boolean;
  data: {
    serviceFeeBills: ServiceFeeBill[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface ServiceFeeBillResponse {
  success: boolean;
  data: ServiceFeeBill;
}

interface GenerateServiceFeeBillsResponse {
  success: boolean;
  data: {
    generated: number;
    skipped: number;
    details: {
      classAcademicId?: string;
      period: string;
      year: number;
      students: number;
    };
  };
}

interface GenerateAllServiceFeeBillsResponse {
  success: boolean;
  data: {
    created: number;
    skipped: number;
    exitSkipped: number;
  };
}

export function useServiceFeeBills(filters: ServiceFeeBillFilters = {}) {
  return useQuery({
    queryKey: queryKeys.serviceFeeBills.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<ServiceFeeBillListResponse>(
        "/service-fee-bills",
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

export function useServiceFeeBill(id: string) {
  return useQuery({
    queryKey: queryKeys.serviceFeeBills.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ServiceFeeBillResponse>(
        `/service-fee-bills/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

export function useDeleteServiceFeeBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/service-fee-bills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.serviceFeeBills.lists(),
      });
    },
  });
}

export function useGenerateServiceFeeBills() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      classAcademicId: string;
      period: string;
      year: number;
    }) => {
      const { data } = await apiClient.post<GenerateServiceFeeBillsResponse>(
        "/service-fee-bills/generate",
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.serviceFeeBills.lists(),
      });
    },
  });
}

export function useGenerateAllServiceFeeBills() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { academicYearId?: string }) => {
      const { data } = await apiClient.post<GenerateAllServiceFeeBillsResponse>(
        "/service-fee-bills/generate-all",
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.serviceFeeBills.lists(),
      });
    },
  });
}
