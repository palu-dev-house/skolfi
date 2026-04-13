"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useGetMe } from "@/hooks/api/useGetMe";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useGetMe();

  const login = async (email: string, password: string) => {
    const { data } = await apiClient.post<{
      success: boolean;
      error?: { message: string };
    }>("/auth/login", { email, password });

    if (data.success) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      router.push("/admin");
      return { success: true };
    }

    throw new Error(data.error?.message || "Login failed");
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      queryClient.setQueryData(queryKeys.auth.me(), null);
      queryClient.clear();
      useAuthStore.getState().clear();
      router.push("/");
    }
  };

  return {
    user: user ?? null,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
  };
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (passwords: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const { data } = await apiClient.post<{
        success: boolean;
        data: { message: string };
      }>("/auth/change-password", passwords);
      return data.data;
    },
  });
}
