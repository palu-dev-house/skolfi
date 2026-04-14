"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { type FeeServiceFilters, queryKeys } from "@/lib/query-keys";

export interface FeeService {
  id: string;
  academicYearId: string;
  category: "TRANSPORT" | "ACCOMMODATION";
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  academicYear?: { id: string; year: string };
  _count?: { prices: number; subscriptions: number };
}

interface FeeServiceListResponse {
  success: boolean;
  data: {
    feeServices: FeeService[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface FeeServiceResponse {
  success: boolean;
  data: FeeService;
}

export function useFeeServices(filters: FeeServiceFilters = {}) {
  return useQuery({
    queryKey: queryKeys.feeServices.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<FeeServiceListResponse>(
        "/fee-services",
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

export function useFeeService(id: string) {
  return useQuery({
    queryKey: queryKeys.feeServices.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<FeeServiceResponse>(
        `/fee-services/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

interface CreateFeeServiceInput {
  academicYearId: string;
  category: "TRANSPORT" | "ACCOMMODATION";
  name: string;
  description?: string;
  isActive?: boolean;
  initialPrice?: { amount: string; effectiveFrom: string };
}

export function useCreateFeeService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateFeeServiceInput) => {
      const { data } = await apiClient.post<FeeServiceResponse>(
        "/fee-services",
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.feeServices.lists(),
      });
    },
  });
}

export function useUpdateFeeService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<FeeService, "name" | "description" | "isActive">>;
    }) => {
      const { data } = await apiClient.put<FeeServiceResponse>(
        `/fee-services/${id}`,
        updates,
      );
      return data.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.feeServices.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.feeServices.detail(vars.id),
      });
    },
  });
}

export function useDeleteFeeService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/fee-services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.feeServices.lists(),
      });
    },
  });
}
