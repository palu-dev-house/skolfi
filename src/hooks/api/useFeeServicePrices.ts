"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface FeeServicePrice {
  id: string;
  feeServiceId: string;
  amount: string;
  effectiveFrom: string;
  note: string | null;
  createdAt: string;
}

interface FeeServicePriceListResponse {
  success: boolean;
  data: { prices: FeeServicePrice[] };
}

interface FeeServicePriceResponse {
  success: boolean;
  data: FeeServicePrice;
}

export function useFeeServicePrices(feeServiceId: string) {
  return useQuery({
    queryKey: queryKeys.feeServices.prices(feeServiceId),
    queryFn: async () => {
      const { data } = await apiClient.get<FeeServicePriceListResponse>(
        `/fee-services/${feeServiceId}/prices`,
      );
      return data.data.prices;
    },
    enabled: !!feeServiceId,
  });
}

export function useAddFeeServicePrice(feeServiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      amount: string;
      effectiveFrom: string;
      note?: string;
    }) => {
      const { data } = await apiClient.post<FeeServicePriceResponse>(
        `/fee-services/${feeServiceId}/prices`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.feeServices.prices(feeServiceId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.feeServices.detail(feeServiceId),
      });
    },
  });
}

export function useDeleteFeeServicePrice(feeServiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (priceId: string) => {
      await apiClient.delete(`/fee-services/${feeServiceId}/prices/${priceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.feeServices.prices(feeServiceId),
      });
    },
  });
}
