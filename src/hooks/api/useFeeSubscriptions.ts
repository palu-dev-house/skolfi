"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { type FeeSubscriptionFilters, queryKeys } from "@/lib/query-keys";

export interface FeeSubscription {
  id: string;
  studentNis: string;
  feeServiceId: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  student?: { nis: string; name: string };
  feeService?: {
    id: string;
    name: string;
    category: "TRANSPORT" | "ACCOMMODATION";
  };
}

interface FeeSubscriptionListResponse {
  success: boolean;
  data: {
    subscriptions: FeeSubscription[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface FeeSubscriptionResponse {
  success: boolean;
  data: FeeSubscription;
}

export function useFeeSubscriptions(filters: FeeSubscriptionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.feeSubscriptions.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<FeeSubscriptionListResponse>(
        "/fee-subscriptions",
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

export function useCreateFeeSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      studentNis: string;
      feeServiceId: string;
      startDate: string;
      endDate?: string | null;
      notes?: string;
    }) => {
      const { data } = await apiClient.post<FeeSubscriptionResponse>(
        "/fee-subscriptions",
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.feeSubscriptions.lists(),
      });
    },
  });
}

export function useUpdateFeeSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: { endDate?: string | null; notes?: string };
    }) => {
      const { data } = await apiClient.put<FeeSubscriptionResponse>(
        `/fee-subscriptions/${id}`,
        updates,
      );
      return data.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.feeSubscriptions.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.feeSubscriptions.detail(vars.id),
      });
    },
  });
}

export function useDeleteFeeSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/fee-subscriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.feeSubscriptions.lists(),
      });
    },
  });
}
