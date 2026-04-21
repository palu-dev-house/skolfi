"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys, type StudentFilters } from "@/lib/query-keys";

interface Student {
  id: string;
  nis: string;
  schoolLevel: "TK" | "SD" | "SMP" | "SMA";
  name: string;
  address: string;
  parentName: string;
  parentPhone: string;
  startJoinDate: string;
  createdAt: string;
  updatedAt?: string;
  // Account fields
  hasAccount: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  lastPaymentAt: string | null;
  accountCreatedAt: string | null;
  accountCreatedBy: string | null;
  accountDeleted: boolean;
  accountDeletedAt: string | null;
  accountDeletedReason: string | null;
  // Exit tracking
  exitedAt: string | null;
  exitReason: string | null;
  exitedBy: string | null;
}

interface StudentListResponse {
  success: boolean;
  data: {
    students: Student[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export function useStudents(filters: StudentFilters = {}) {
  return useQuery({
    queryKey: queryKeys.students.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<StudentListResponse>("/students", {
        params: filters as Record<
          string,
          string | number | boolean | undefined
        >,
      });
      return data.data;
    },
  });
}

export function useStudent(nis: string) {
  return useQuery({
    queryKey: queryKeys.students.detail(nis),
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: Student }>(
        `/students/${nis}`,
      );
      return data.data;
    },
    enabled: !!nis,
  });
}

interface CreateStudentInput {
  nis: string;
  schoolLevel: "TK" | "SD" | "SMP" | "SMA";
  name: string;
  address: string;
  parentName: string;
  parentPhone: string;
  startJoinDate: string;
}

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (student: CreateStudentInput) => {
      const { data } = await apiClient.post<{
        success: boolean;
        data: Student;
      }>("/students", student);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      nis,
      updates,
    }: {
      nis: string;
      updates: Partial<Omit<Student, "nis" | "createdAt" | "updatedAt">>;
    }) => {
      const { data } = await apiClient.put<{ success: boolean; data: Student }>(
        `/students/${nis}`,
        updates,
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.students.detail(variables.nis),
      });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nis: string) => {
      await apiClient.delete(`/students/${nis}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
    },
  });
}

export function useBulkDeleteStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nisList: string[]) => {
      const { data } = await apiClient.post<{
        success: boolean;
        data: {
          deleted: number;
          skipped: Array<{ nis: string; name: string }>;
        };
      }>("/students/bulk-delete", { nisList });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
    },
  });
}

export function useBulkUpdateStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      nisList: string[];
      updates: { startJoinDate?: string };
    }) => {
      const { data } = await apiClient.put<{
        success: boolean;
        data: { updated: number };
      }>("/students/bulk-update", params);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
    },
  });
}

export function useImportStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post<{
        success: boolean;
        data: { imported: number; updated: number; errors: unknown[] };
      }>("/students/import", formData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
    },
  });
}
