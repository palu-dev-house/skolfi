"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface PartialWarning {
  tuitionId: string;
  period: string;
  year: number;
  paidAmount: string;
}

interface RecordExitResponse {
  voidedCount: number;
  partialWarnings: PartialWarning[];
}

interface UndoExitResponse {
  restoredCount: number;
}

export function useRecordStudentExit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      nis,
      exitDate,
      reason,
    }: {
      nis: string;
      exitDate: string;
      reason: string;
    }) => {
      const { data } = await apiClient.post<{
        success: boolean;
        data: RecordExitResponse;
      }>(`/students/${nis}/exit`, { exitDate, reason });
      return data.data;
    },
    onSuccess: (_, { nis }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.students.detail(nis),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tuitions.all });
    },
  });
}

export function useUndoStudentExit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nis: string) => {
      const { data } = await apiClient.delete<{
        success: boolean;
        data: UndoExitResponse;
      }>(`/students/${nis}/exit`);
      return data.data;
    },
    onSuccess: (_, nis) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.students.detail(nis),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tuitions.all });
    },
  });
}
