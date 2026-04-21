"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { type ClassAcademicFilters, queryKeys } from "@/lib/query-keys";

interface ClassAcademic {
  id: string;
  academicYearId: string;
  schoolLevel: "TK" | "SD" | "SMP" | "SMA";
  grade: number;
  section: string;
  className: string;
  createdAt: string;
  updatedAt?: string;
  academicYear?: {
    year: string;
    isActive?: boolean;
  };
  _count?: {
    tuitions: number;
    scholarships: number;
    studentClasses: number;
  };
}

interface ClassAcademicListResponse {
  success: boolean;
  data: {
    classes: ClassAcademic[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface ClassAcademicResponse {
  success: boolean;
  data: ClassAcademic;
}

export function useClassAcademics(filters: ClassAcademicFilters = {}) {
  return useQuery({
    queryKey: queryKeys.classAcademics.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<ClassAcademicListResponse>(
        "/class-academics",
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

export function useClassAcademic(id: string) {
  return useQuery({
    queryKey: queryKeys.classAcademics.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ClassAcademicResponse>(
        `/class-academics/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateClassAcademic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (classAcademic: {
      academicYearId: string;
      schoolLevel: "TK" | "SD" | "SMP" | "SMA";
      grade: number;
      section: string;
    }) => {
      const { data } = await apiClient.post<ClassAcademicResponse>(
        "/class-academics",
        classAcademic,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.classAcademics.lists(),
      });
    },
  });
}

export function useUpdateClassAcademic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        academicYearId?: string;
        schoolLevel?: "TK" | "SD" | "SMP" | "SMA";
        grade?: number;
        section?: string;
      };
    }) => {
      const { data } = await apiClient.put<ClassAcademicResponse>(
        `/class-academics/${id}`,
        updates,
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.classAcademics.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.classAcademics.detail(variables.id),
      });
    },
  });
}

export function useDeleteClassAcademic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/class-academics/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.classAcademics.lists(),
      });
    },
  });
}

export function useBulkDeleteClassAcademics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await apiClient.post<{
        success: boolean;
        data: {
          deleted: number;
          skipped: Array<{ id: string; className: string }>;
        };
      }>("/classes/bulk-delete", { ids });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.classAcademics.lists(),
      });
    },
  });
}

export function useImportClassAcademics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post<{
        success: boolean;
        data: {
          imported: number;
          errors: Array<{ row: number; error: string }>;
        };
      }>("/class-academics/import", formData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.classAcademics.lists(),
      });
    },
  });
}
