"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { type EmployeeFilters, queryKeys } from "@/lib/query-keys";

interface Employee {
  employeeId: string;
  name: string;
  email: string;
  role: "ADMIN" | "CASHIER";
  createdAt: string;
  updatedAt?: string;
}

interface EmployeeListResponse {
  success: boolean;
  data: {
    employees: Employee[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface EmployeeResponse {
  success: boolean;
  data: Employee;
}

export function useEmployees(filters: EmployeeFilters = {}) {
  return useQuery({
    queryKey: queryKeys.employees.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<EmployeeListResponse>("/employees", {
        params: filters as Record<
          string,
          string | number | boolean | undefined
        >,
      });
      return data.data;
    },
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<EmployeeResponse>(
        `/employees/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employee: {
      name: string;
      email: string;
      role: "ADMIN" | "CASHIER";
    }) => {
      const { data } = await apiClient.post<EmployeeResponse>(
        "/employees",
        employee,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.lists() });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: { name?: string; email?: string; role?: "ADMIN" | "CASHIER" };
    }) => {
      const { data } = await apiClient.put<EmployeeResponse>(
        `/employees/${id}`,
        updates,
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.employees.detail(variables.id),
      });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.lists() });
    },
  });
}

export function useBulkDeleteEmployees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await apiClient.post<{
        success: boolean;
        data: {
          deleted: number;
          skipped: Array<{ id: string; name: string }>;
        };
      }>("/employees/bulk-delete", { ids });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.lists() });
    },
  });
}

export function useResetEmployeePassword() {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/employees/${id}/reset-password`);
    },
  });
}
