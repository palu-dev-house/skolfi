"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { type DiscountFilters, queryKeys } from "@/lib/query-keys";

interface Discount {
  id: string;
  name: string;
  description: string | null;
  reason: string | null;
  discountAmount: string;
  targetPeriods: string[];
  academicYearId: string;
  classAcademicId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  academicYear?: {
    id: string;
    year: string;
  };
  classAcademic?: {
    id: string;
    className: string;
    grade: number;
    section: string;
  } | null;
  _count?: {
    tuitions: number;
  };
}

interface DiscountListResponse {
  success: boolean;
  data: {
    discounts: Discount[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface DiscountDetailResponse {
  success: boolean;
  data: {
    discount: Discount;
    stats: {
      tuitionsByStatus: Record<string, number>;
      totalTuitionsApplied: number;
      totalDiscountApplied: number;
    };
  };
}

interface DiscountResponse {
  success: boolean;
  data: {
    discount: Discount;
  };
}

interface ApplyPreviewResponse {
  success: boolean;
  data: {
    preview: true;
    discount: {
      id: string;
      name: string;
      discountAmount: number;
      targetPeriods: string[];
      scope: string;
    };
    affectedTuitions: Array<{
      id: string;
      studentName: string;
      studentId: string;
      className: string;
      period: string;
      year: number;
      currentDiscountAmount: number;
    }>;
    summary: {
      tuitionCount: number;
      totalDiscountAmount: number;
    };
  };
}

interface ApplyResultResponse {
  success: boolean;
  data: {
    applied: true;
    discount: {
      id: string;
      name: string;
      discountAmount: number;
    };
    results: {
      tuitionsUpdated: number;
      totalDiscountApplied: number;
      details: Array<{
        tuitionId: string;
        discountId: string;
        discountAmount: number;
        previousDiscountAmount: number;
      }>;
    };
  };
}

interface ImportResponse {
  success: boolean;
  data: {
    imported: number;
    skipped: number;
    tuitionsAffected: number;
    errors: Array<{ row: number; error?: string; errors?: string[] }>;
  };
}

export function useDiscounts(filters: DiscountFilters = {}) {
  return useQuery({
    queryKey: queryKeys.discounts.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<DiscountListResponse>("/discounts", {
        params: filters as Record<
          string,
          string | number | boolean | undefined
        >,
      });
      return data.data;
    },
  });
}

export function useDiscount(id: string) {
  return useQuery({
    queryKey: queryKeys.discounts.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<DiscountDetailResponse>(
        `/discounts/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (discount: {
      name: string;
      description?: string;
      reason?: string;
      discountAmount: number;
      targetPeriods: string[];
      academicYearId: string;
      classAcademicId?: string | null;
    }) => {
      const { data } = await apiClient.post<DiscountResponse>(
        "/discounts",
        discount,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discounts.lists(),
      });
    },
  });
}

export function useUpdateDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        name?: string;
        description?: string | null;
        reason?: string | null;
        discountAmount?: number;
        targetPeriods?: string[];
        isActive?: boolean;
      };
    }) => {
      const { data } = await apiClient.put<DiscountResponse>(
        `/discounts/${id}`,
        updates,
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discounts.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.discounts.detail(variables.id),
      });
    },
  });
}

export function useDeleteDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/discounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discounts.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tuitions.lists(),
      });
    },
  });
}

export function useBulkDeleteDiscounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await apiClient.post<{
        success: boolean;
        data: {
          deleted: number;
          skipped: Array<{ id: string; name: string }>;
        };
      }>("/discounts/bulk-delete", { ids });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discounts.lists(),
      });
    },
  });
}

export function useBulkUpdateDiscounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      ids: string[];
      updates: { discountAmount?: number; isActive?: boolean };
    }) => {
      const { data } = await apiClient.put<{
        success: boolean;
        data: { updated: number };
      }>("/discounts/bulk-update", payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discounts.lists(),
      });
    },
  });
}

export function useApplyDiscountPreview() {
  return useMutation({
    mutationFn: async (discountId: string) => {
      const { data } = await apiClient.post<ApplyPreviewResponse>(
        "/discounts/apply",
        { discountId, preview: true },
      );
      return data.data;
    },
  });
}

export function useApplyDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (discountId: string) => {
      const { data } = await apiClient.post<ApplyResultResponse>(
        "/discounts/apply",
        { discountId, preview: false },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discounts.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tuitions.lists(),
      });
    },
  });
}

export function useImportDiscounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      applyImmediately,
    }: {
      file: File;
      applyImmediately: boolean;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("applyImmediately", String(applyImmediately));
      const { data } = await apiClient.post<ImportResponse>(
        "/discounts/import",
        formData,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discounts.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tuitions.lists(),
      });
    },
  });
}
