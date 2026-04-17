"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaymentStatus } from "@/generated/prisma/client";
import { apiClient } from "@/lib/api-client";
import { queryKeys, type TuitionFilters } from "@/lib/query-keys";

interface Tuition {
  id: string;
  classAcademicId: string;
  studentId: string;
  period: string;
  year: number;
  feeAmount: string;
  scholarshipAmount: string;
  discountAmount: string;
  discountId: string | null;
  paidAmount: string;
  status: PaymentStatus;
  dueDate: string;
  generatedAt: string;
  createdAt: string;
  updatedAt?: string;
  student?: {
    nis: string;
    name: string;
    parentPhone?: string;
  };
  classAcademic?: {
    className: string;
    grade: number;
    section: string;
    academicYear?: {
      year: string;
    };
  };
  discount?: {
    id: string;
    name: string;
    reason: string | null;
    discountAmount: string;
  } | null;
  _count?: {
    payments: number;
  };
  scholarships?: Array<{
    id: string;
    name: string;
    nominal: string;
    isFullScholarship: boolean;
  }>;
  scholarshipSummary?: {
    count: number;
    totalAmount: string;
    hasFullScholarship: boolean;
  } | null;
}

interface TuitionListResponse {
  success: boolean;
  data: {
    tuitions: Tuition[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface TuitionResponse {
  success: boolean;
  data: Tuition;
}

interface GenerateResponse {
  success: boolean;
  data: {
    generated: number;
    skipped: number;
    details: {
      totalStudents: number;
      studentsWithFullYear: number;
      studentsWithPartialYear: number;
      className: string;
      academicYear: string;
      discountsApplied?: Array<{
        id: string;
        name: string;
        amount: number;
        targetPeriods: string[];
        scope: string;
      }>;
    };
  };
}

interface GenerateBulkResponse {
  success: boolean;
  data: {
    totalGenerated: number;
    totalSkipped: number;
    results: Array<{
      classAcademicId: string;
      className: string;
      generated: number;
      skipped: number;
      error?: string;
    }>;
  };
}

export function useTuitions(filters: TuitionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.tuitions.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<TuitionListResponse>("/tuitions", {
        params: filters as Record<
          string,
          string | number | boolean | undefined
        >,
      });
      return data.data;
    },
  });
}

export function useTuition(id: string) {
  return useQuery({
    queryKey: queryKeys.tuitions.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<TuitionResponse>(`/tuitions/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

interface PeriodDiscount {
  period: string;
  discountedFee: number;
  reason?: string;
}

export function useGenerateTuitions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      classAcademicId: string;
      feeAmount: number;
      paymentFrequency?: "MONTHLY" | "QUARTERLY" | "SEMESTER";
      periodDiscounts?: PeriodDiscount[];
      studentIdList?: string[];
    }) => {
      const { data } = await apiClient.post<GenerateResponse>(
        "/tuitions/generate",
        params,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tuitions.lists(),
      });
    },
  });
}

export function useGenerateBulkTuitions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      classes: Array<{
        classAcademicId: string;
        feeAmount: number;
        studentIdList?: string[];
      }>;
    }) => {
      const { data } = await apiClient.post<GenerateBulkResponse>(
        "/tuitions/generate-bulk",
        params,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tuitions.lists(),
      });
    },
  });
}

export function useUpdateTuition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        feeAmount?: number;
        dueDate?: string;
        status?: PaymentStatus;
      };
    }) => {
      const { data } = await apiClient.put<TuitionResponse>(
        `/tuitions/${id}`,
        updates,
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tuitions.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tuitions.detail(variables.id),
      });
    },
  });
}

export function useDeleteTuition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tuitions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tuitions.lists(),
      });
    },
  });
}

interface ImportTuitionsResponse {
  success: boolean;
  data: {
    generated: number;
    skipped: number;
    errors: Array<{ row: number; error?: string; errors?: string[] }>;
  };
}

export function useImportTuitions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post<ImportTuitionsResponse>(
        "/tuitions/import",
        formData,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tuitions.lists(),
      });
    },
  });
}

export function useMassUpdateTuitions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      tuitionIds: string[];
      status: PaymentStatus;
    }) => {
      const { data } = await apiClient.put<{
        success: boolean;
        data: { updated: number; status: string };
      }>("/tuitions/mass-update", params);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tuitions.lists(),
      });
    },
  });
}
