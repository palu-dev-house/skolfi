"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { studentApiClient } from "@/lib/student-api-client";

interface StudentUser {
  nis: string;
  name: string;
  parentName: string;
  parentPhone: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  exitedAt: string | null;
  exitReason: string | null;
}

interface LoginResponse {
  success: boolean;
  data: {
    message: string;
    mustChangePassword: boolean;
    user: {
      studentNis: string;
      studentName: string;
    };
  };
}

interface MeResponse {
  success: boolean;
  data: StudentUser;
}

export function useStudentMe(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.studentAuth.me(),
    queryFn: async () => {
      const { data } =
        await studentApiClient.get<MeResponse>("/student-auth/me");
      return data.data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

export function useStudentLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: { nis: string; password: string }) => {
      // Clear all cached data before login to prevent stale data from previous user
      queryClient.clear();
      const { data } = await studentApiClient.post<LoginResponse>(
        "/student-auth/login",
        credentials,
      );
      return data.data;
    },
    onSuccess: () => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: queryKeys.studentAuth.all });
    },
  });
}

export function useStudentLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await studentApiClient.post("/student-auth/logout");
    },
    onSuccess: () => {
      // Clear the user data first to prevent stale data
      queryClient.setQueryData(queryKeys.studentAuth.me(), null);
      // Clear all cached queries
      queryClient.clear();
      // Use window.location for full page reload to ensure clean state
      window.location.href = "/portal/login";
    },
    onError: () => {
      // Even on error, clear local state and redirect
      queryClient.setQueryData(queryKeys.studentAuth.me(), null);
      queryClient.clear();
      window.location.href = "/portal/login";
    },
  });
}

export function useStudentChangePassword() {
  return useMutation({
    mutationFn: async (passwords: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const { data } = await studentApiClient.post<{
        success: boolean;
        data: { message: string };
      }>("/student-auth/change-password", passwords);
      return data.data;
    },
  });
}
