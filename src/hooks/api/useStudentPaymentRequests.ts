"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { getFrontendExpiryFromBackend } from "@/lib/business-logic/payment-timing";
import { queryKeys, type StudentPaymentRequestFilters } from "@/lib/query-keys";
import { studentApiClient } from "@/lib/student-api-client";

interface TuitionInfo {
  id?: string;
  period: string;
  year: number;
  feeAmount?: string;
  paidAmount?: string;
  scholarshipAmount?: string;
  discountAmount?: string;
  amount?: string;
  className?: string;
  academicYear?: string;
  status?: string;
}

interface PaymentRequest {
  id: string;
  bankAccountId: string | null;
  baseAmount: string;
  uniqueCode: number;
  totalAmount: string;
  status:
    | "PENDING"
    | "EXPIRED"
    | "VERIFYING"
    | "VERIFIED"
    | "FAILED"
    | "CANCELLED";
  expiresAt: string;
  createdAt: string;
  verifiedAt: string | null;
  student?: {
    nis: string;
    name: string;
    parentName: string;
    parentPhone: string;
  };
  tuitions: TuitionInfo[];
  bankAccount?: {
    id?: string;
    bankName: string;
    accountNumber: string;
    accountName?: string;
    logoUrl?: string;
  } | null;
}

export type { PaymentRequest, TuitionInfo };

interface PaymentRequestsResponse {
  success: boolean;
  data: {
    requests: PaymentRequest[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface PaymentRequestResponse {
  success: boolean;
  data: PaymentRequest;
}

export function useStudentPaymentRequests(
  filters: StudentPaymentRequestFilters = {},
) {
  return useQuery({
    queryKey: queryKeys.studentPaymentRequests.list(filters),
    queryFn: async () => {
      const { data } = await studentApiClient.get<PaymentRequestsResponse>(
        "/student/payment-requests",
        {
          params: filters as Record<
            string,
            string | number | boolean | undefined
          >,
        },
      );
      return {
        paymentRequests: data.data.requests,
        pagination: data.data.pagination,
      };
    },
  });
}

export function useStudentPaymentRequest(id: string) {
  return useQuery({
    queryKey: queryKeys.studentPaymentRequests.detail(id),
    queryFn: async () => {
      const { data } = await studentApiClient.get<PaymentRequestResponse>(
        `/student/payment-requests/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      if (typeof query.state.data === "undefined") return false;
      if (
        getFrontendExpiryFromBackend(new Date(query.state.data.expiresAt)) <
        new Date()
      ) {
        return false;
      }

      // Poll every 5 seconds if status is PENDING
      const status = query.state.data?.status;
      return status === "PENDING" ? 5000 : false;
    },
    select(data) {
      if (typeof data === "undefined") return undefined;
      if (
        getFrontendExpiryFromBackend(new Date(data.expiresAt)) < new Date() &&
        data.status === "PENDING"
      ) {
        data.status = "EXPIRED";
      }
      return data;
    },
  });
}

export function useActivePaymentRequest() {
  return useQuery({
    queryKey: queryKeys.studentPaymentRequests.active(),
    queryFn: async () => {
      const { data } = await studentApiClient.get<{
        success: boolean;
        data: PaymentRequest | null;
      }>("/student/payment-requests/active");
      return data.data;
    },
    refetchInterval: (query) => {
      if (
        typeof query.state.data === "undefined" ||
        query.state.data === null
      ) {
        return undefined;
      }
      if (
        getFrontendExpiryFromBackend(new Date(query.state.data.expiresAt)) <
        new Date()
      ) {
        return false;
      }
      // Poll every 5 seconds if there's an active pending request
      const status = query.state.data?.status;
      return status === "PENDING" ? 5000 : false;
    },
  });
}

export function useCreatePaymentRequest() {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const mutation = useMutation({
    mutationFn: async (input: { tuitionIds: string[] }) => {
      const { data } = await studentApiClient.post<PaymentRequestResponse>(
        "/student/payment-requests",
        input,
        {
          headers: {
            "X-Idempotency-Key": idempotencyKeyRef.current,
          },
        },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentPaymentRequests.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentPaymentRequests.active(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentTuitions.all,
      });
    },
  });

  const resetIdempotencyKey = () => {
    idempotencyKeyRef.current = crypto.randomUUID();
  };

  return {
    ...mutation,
    resetIdempotencyKey,
  };
}

export function useCancelPaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentRequestId: string) => {
      const { data } = await studentApiClient.post<PaymentRequestResponse>(
        `/student/payment-requests/${paymentRequestId}/cancel`,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentPaymentRequests.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentPaymentRequests.active(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentTuitions.all,
      });
    },
  });
}
