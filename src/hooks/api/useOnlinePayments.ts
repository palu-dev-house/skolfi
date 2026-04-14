"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { studentApiClient } from "@/lib/student-api-client";

export interface OnlinePaymentItem {
  id: string;
  amount: string;
  tuition?: {
    id: string;
    period: string;
    year: number;
    feeAmount: string;
    paidAmount: string;
    status: string;
    classAcademic: {
      className: string;
      academicYear: { year: string };
    };
  } | null;
  feeBill?: {
    id: string;
    period: string;
    year: number;
    amount: string;
    paidAmount: string;
    status: string;
    feeService: { id: string; name: string; category: string };
  } | null;
  serviceFeeBill?: {
    id: string;
    period: string;
    year: number;
    amount: string;
    paidAmount: string;
    status: string;
    serviceFee: { id: string; name: string };
    classAcademic: { className: string };
  } | null;
}

export interface OnlinePaymentItemInput {
  tuitionId?: string;
  feeBillId?: string;
  serviceFeeBillId?: string;
}

export interface CreateOnlinePaymentInput {
  items: OnlinePaymentItemInput[];
}

export interface OnlinePayment {
  id: string;
  orderId: string;
  grossAmount: string;
  snapToken: string | null;
  snapRedirectUrl: string | null;
  bank: string | null;
  vaNumber: string | null;
  billKey: string | null;
  billerCode: string | null;
  paymentType: string | null;
  status: "PENDING" | "SETTLEMENT" | "EXPIRE" | "CANCEL" | "DENY" | "FAILURE";
  expiryTime: string | null;
  settlementTime: string | null;
  createdAt: string;
  items: OnlinePaymentItem[];
}

interface OnlinePaymentsResponse {
  success: boolean;
  data: { payments: OnlinePayment[] };
}

interface OnlinePaymentDetailResponse {
  success: boolean;
  data: { payment: OnlinePayment };
}

interface CreateOnlinePaymentResponse {
  success: boolean;
  data: {
    id: string;
    orderId: string;
    snapToken: string;
    snapRedirectUrl: string;
    grossAmount: number;
  };
}

interface PaymentConfigResponse {
  success: boolean;
  data: {
    clientKey: string;
    snapJsUrl: string;
    enabled: boolean;
    maintenanceMessage: string | null;
  };
}

export function useStudentOnlinePayments(filters?: { status?: string }) {
  return useQuery({
    queryKey: queryKeys.studentOnlinePayments.list(filters),
    queryFn: async () => {
      const { data } = await studentApiClient.get<OnlinePaymentsResponse>(
        "/student/online-payments",
        { params: filters },
      );
      return data.data.payments;
    },
  });
}

export function useStudentOnlinePayment(id: string | null) {
  return useQuery({
    queryKey: queryKeys.studentOnlinePayments.detail(id || ""),
    enabled: !!id,
    queryFn: async () => {
      const { data } = await studentApiClient.get<OnlinePaymentDetailResponse>(
        `/student/online-payments/${id}`,
      );
      return data.data.payment;
    },
    refetchInterval: (query) => {
      // Auto-poll every 5s while PENDING
      if (query.state.data?.status === "PENDING") return 5000;
      return false;
    },
  });
}

export function usePaymentConfig() {
  return useQuery({
    queryKey: queryKeys.studentOnlinePayments.config(),
    queryFn: async () => {
      const { data } = await studentApiClient.get<PaymentConfigResponse>(
        "/student/online-payments/config",
      );
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // Cache 5 min
  });
}

export function useCreateOnlinePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOnlinePaymentInput) => {
      const { data } = await studentApiClient.post<CreateOnlinePaymentResponse>(
        "/student/online-payments",
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentTuitions.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentOutstanding.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentOnlinePayments.all,
      });
    },
  });
}

export function useCancelOnlinePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await studentApiClient.post(`/student/online-payments/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentTuitions.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentOutstanding.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentOnlinePayments.all,
      });
    },
  });
}
