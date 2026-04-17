"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys, type ScholarshipFilters } from "@/lib/query-keys";

interface Scholarship {
  id: string;
  studentId: string;
  classAcademicId: string;
  name: string;
  nominal: string;
  isFullScholarship: boolean;
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
}

interface ScholarshipListResponse {
  success: boolean;
  data: {
    scholarships: Scholarship[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface ScholarshipResponse {
  success: boolean;
  data: {
    scholarship: Scholarship;
    applicationResult?: {
      isFullScholarship: boolean;
      tuitionsAffected: number;
      autoPayments: Array<{
        tuitionId: string;
        amount: number;
      }>;
    };
  };
}

interface ImportResponse {
  success: boolean;
  data: {
    imported: number;
    skipped: number;
    autoPayments: number;
    errors: Array<{ row: number; error?: string; errors?: string[] }>;
  };
}

export function useScholarships(filters: ScholarshipFilters = {}) {
  return useQuery({
    queryKey: queryKeys.scholarships.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<ScholarshipListResponse>(
        "/scholarships",
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

export function useScholarship(id: string) {
  return useQuery({
    queryKey: queryKeys.scholarships.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<{
        success: boolean;
        data: Scholarship;
      }>(`/scholarships/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateScholarship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scholarship: {
      studentId: string;
      classAcademicId: string;
      name?: string;
      nominal: number;
    }) => {
      const { data } = await apiClient.post<ScholarshipResponse>(
        "/scholarships",
        scholarship,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.scholarships.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tuitions.lists(),
      });
    },
  });
}

export function useDeleteScholarship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/scholarships/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.scholarships.lists(),
      });
    },
  });
}

export function useBulkDeleteScholarships() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await apiClient.post<{
        success: boolean;
        data: { deleted: number };
      }>("/scholarships/bulk-delete", { ids });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.scholarships.lists(),
      });
    },
  });
}

export function useBulkUpdateScholarships() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      ids: string[];
      updates: { nominal?: number; isFullScholarship?: boolean };
    }) => {
      const { data } = await apiClient.put<{
        success: boolean;
        data: { updated: number };
      }>("/scholarships/bulk-update", payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.scholarships.lists(),
      });
    },
  });
}

export function useImportScholarships() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post<ImportResponse>(
        "/scholarships/import",
        formData,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.scholarships.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tuitions.lists(),
      });
    },
  });
}
