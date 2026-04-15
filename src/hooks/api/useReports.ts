"use client";

import { useQuery } from "@tanstack/react-query";
import type { Month } from "@/generated/prisma/client";
import { apiClient } from "@/lib/api-client";
import {
  type ClassSummaryFilters,
  type OverdueFilters,
  queryKeys,
} from "@/lib/query-keys";

interface OverduePeriod {
  tuitionId: string;
  period: Month;
  year: number;
  feeAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: string;
  daysOverdue: number;
  discountAmount: number;
  scholarshipAmount: number;
}
interface OverdueByStudent {
  student: {
    nis: string;
    name: string;
    parentName: string;
    parentPhone: string;
  };
  class: {
    className: string;
    grade: number;
    section: string;
  };
  overduePeriods: OverduePeriod[];
  totalOverdue: number;
  overdueCount: number;
}

interface OverdueSummary {
  totalStudents: number;
  totalOverdueAmount: number;
  totalOverdueRecords: number;
}

interface OverdueReportResponse {
  success: boolean;
  data: {
    overdue: OverdueByStudent[];
    summary: OverdueSummary;
  };
}

export interface BillBreakdown {
  totalBills: number;
  paid: number;
  partial: number;
  unpaid: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
}

interface ClassSummaryItem {
  class: {
    id: string;
    className: string;
    grade: number;
    section: string;
  };
  statistics: {
    totalStudents: number;
    totalTuitions: number;
    paid: number;
    unpaid: number;
    partial: number;
    totalFees: number;
    totalScholarships: number;
    totalDiscounts: number;
    totalEffectiveFees: number;
    totalPaid: number;
    totalOutstanding: number;
    feeBill: BillBreakdown;
    serviceFeeBill: BillBreakdown;
  };
}

interface ClassSummaryResponse {
  success: boolean;
  data: {
    classes: ClassSummaryItem[];
    totals: {
      totalStudents: number;
      totalTuitions: number;
      paid: number;
      unpaid: number;
      partial: number;
      totalFees: number;
      totalScholarships: number;
      totalDiscounts: number;
      totalEffectiveFees: number;
      totalPaid: number;
      totalOutstanding: number;
      feeBill: BillBreakdown;
      serviceFeeBill: BillBreakdown;
    };
  };
}

export function useOverdueReport(filters: OverdueFilters = {}) {
  return useQuery({
    queryKey: queryKeys.reports.overdue(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<OverdueReportResponse>(
        "/reports/overdue",
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

interface OverdueFeeBillPeriod {
  feeBillId: string;
  feeServiceName: string;
  category: "TRANSPORT" | "ACCOMMODATION";
  period: Month;
  year: number;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: string;
  daysOverdue: number;
}

export interface OverdueFeeBillByStudent {
  student: {
    nis: string;
    name: string;
    parentName: string;
    parentPhone: string;
  };
  class: {
    className: string;
    grade: number;
    section: string;
  };
  overdueBills: OverdueFeeBillPeriod[];
  totalOverdue: number;
  overdueCount: number;
}

interface OverdueServiceFeeBillPeriod {
  serviceFeeBillId: string;
  serviceFeeName: string;
  period: Month;
  year: number;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: string;
  daysOverdue: number;
}

export interface OverdueServiceFeeBillByStudent {
  student: {
    nis: string;
    name: string;
    parentName: string;
    parentPhone: string;
  };
  class: {
    className: string;
    grade: number;
    section: string;
  };
  overdueBills: OverdueServiceFeeBillPeriod[];
  totalOverdue: number;
  overdueCount: number;
}

interface OverdueFeeBillResponse {
  success: boolean;
  data: {
    overdue: OverdueFeeBillByStudent[];
    summary: OverdueSummary;
  };
}

interface OverdueServiceFeeBillResponse {
  success: boolean;
  data: {
    overdue: OverdueServiceFeeBillByStudent[];
    summary: OverdueSummary;
  };
}

export function useOverdueFeeBillReport(filters: OverdueFilters = {}) {
  return useQuery({
    queryKey: queryKeys.reports.overdueFeeBills(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<OverdueFeeBillResponse>(
        "/reports/overdue-fee-bills",
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

export function useOverdueServiceFeeBillReport(filters: OverdueFilters = {}) {
  return useQuery({
    queryKey: queryKeys.reports.overdueServiceFeeBills(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<OverdueServiceFeeBillResponse>(
        "/reports/overdue-service-fee-bills",
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

export function useClassSummary(filters: ClassSummaryFilters = {}) {
  return useQuery({
    queryKey: queryKeys.reports.classSummary(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<ClassSummaryResponse>(
        "/reports/class-summary",
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

export function useExportClassSummary() {
  const exportReport = async (filters: ClassSummaryFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.academicYearId) {
      params.set("academicYearId", filters.academicYearId);
    }
    const url = `/api/v1/reports/class-summary/export?${params.toString()}`;
    window.open(url, "_blank");
  };

  return { exportReport };
}

export function useExportOverdueReport() {
  const exportReport = async (filters: OverdueFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.classAcademicId) {
      params.set("classAcademicId", filters.classAcademicId);
    }
    if (filters.grade) {
      params.set("grade", String(filters.grade));
    }
    if (filters.academicYearId) {
      params.set("academicYearId", filters.academicYearId);
    }

    const url = `/api/v1/reports/overdue/export?${params.toString()}`;
    window.open(url, "_blank");
  };

  return { exportReport };
}
