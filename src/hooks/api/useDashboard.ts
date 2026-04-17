"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface RecentPayment {
  id: string;
  amount: number;
  paymentDate: string;
  studentName: string;
  studentId: string;
  className: string;
  processedBy: string;
  scholarshipAmount: number;
  discountAmount: number;
  discount: {
    name: string;
    description?: string;
    reason?: string;
  } | null;
}

interface DashboardStats {
  totalStudents: number;
  totalEmployees: number;
  activeAcademicYear: string | null;
  monthlyRevenue: number;
  monthlyPaymentsCount: number;
  overdueTuitions: number;
  totalOutstanding: number;
  tuitionStats: {
    paid: number;
    unpaid: number;
    partial: number;
    total: number;
  };
  recentPayments: RecentPayment[];
}

interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const { data } =
        await apiClient.get<DashboardStatsResponse>("/dashboard/stats");
      return data.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}
