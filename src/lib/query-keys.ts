export interface EmployeeFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: "ADMIN" | "CASHIER";
}

export interface StudentFilters {
  page?: number;
  limit?: number;
  search?: string;
  startJoinDateFrom?: string;
  startJoinDateTo?: string;
}

export interface AcademicYearFilters {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export interface ClassAcademicFilters {
  page?: number;
  limit?: number;
  academicYearId?: string;
  grade?: number;
  search?: string;
}

export interface TuitionFilters {
  page?: number;
  limit?: number;
  classAcademicId?: string;
  studentNis?: string;
  status?: "UNPAID" | "PAID" | "PARTIAL";
  period?: string;
  month?: string; // Backward compatibility
  year?: number;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export interface ScholarshipFilters {
  page?: number;
  limit?: number;
  classAcademicId?: string;
  studentNis?: string;
  isFullScholarship?: boolean;
}

export interface PaymentFilters {
  page?: number;
  limit?: number;
  studentNis?: string;
  classAcademicId?: string;
  employeeId?: string;
  paymentDateFrom?: string;
  paymentDateTo?: string;
}

export interface OverdueFilters {
  classAcademicId?: string;
  grade?: number;
  academicYearId?: string;
}

export interface ClassSummaryFilters {
  academicYearId?: string;
}

export interface DiscountFilters {
  page?: number;
  limit?: number;
  academicYearId?: string;
  classAcademicId?: string;
  isActive?: boolean;
}

export interface StudentAccountFilters {
  page?: number;
  limit?: number;
  search?: string;
  includeDeleted?: boolean;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  status?: string;
  messageType?: string;
}

export interface OnlinePaymentFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface RateLimitFilters {
  action?: string;
  identifier?: string;
  limit?: number;
}

export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
  },

  employees: {
    all: ["employees"] as const,
    lists: () => [...queryKeys.employees.all, "list"] as const,
    list: (filters: EmployeeFilters) =>
      [...queryKeys.employees.lists(), filters] as const,
    details: () => [...queryKeys.employees.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.employees.details(), id] as const,
  },

  students: {
    all: ["students"] as const,
    lists: () => [...queryKeys.students.all, "list"] as const,
    list: (filters: StudentFilters) =>
      [...queryKeys.students.lists(), filters] as const,
    details: () => [...queryKeys.students.all, "detail"] as const,
    detail: (nis: string) => [...queryKeys.students.details(), nis] as const,
  },

  academicYears: {
    all: ["academic-years"] as const,
    lists: () => [...queryKeys.academicYears.all, "list"] as const,
    list: (filters: AcademicYearFilters) =>
      [...queryKeys.academicYears.lists(), filters] as const,
    details: () => [...queryKeys.academicYears.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.academicYears.details(), id] as const,
    active: () => [...queryKeys.academicYears.all, "active"] as const,
  },

  classAcademics: {
    all: ["class-academics"] as const,
    lists: () => [...queryKeys.classAcademics.all, "list"] as const,
    list: (filters: ClassAcademicFilters) =>
      [...queryKeys.classAcademics.lists(), filters] as const,
    details: () => [...queryKeys.classAcademics.all, "detail"] as const,
    detail: (id: string) =>
      [...queryKeys.classAcademics.details(), id] as const,
    byYear: (yearId: string) =>
      [...queryKeys.classAcademics.all, "by-year", yearId] as const,
  },

  tuitions: {
    all: ["tuitions"] as const,
    lists: () => [...queryKeys.tuitions.all, "list"] as const,
    list: (filters: TuitionFilters) =>
      [...queryKeys.tuitions.lists(), filters] as const,
    details: () => [...queryKeys.tuitions.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.tuitions.details(), id] as const,
    byStudent: (nis: string) =>
      [...queryKeys.tuitions.all, "by-student", nis] as const,
    byClass: (classId: string) =>
      [...queryKeys.tuitions.all, "by-class", classId] as const,
  },

  scholarships: {
    all: ["scholarships"] as const,
    lists: () => [...queryKeys.scholarships.all, "list"] as const,
    list: (filters: ScholarshipFilters) =>
      [...queryKeys.scholarships.lists(), filters] as const,
    details: () => [...queryKeys.scholarships.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.scholarships.details(), id] as const,
  },

  payments: {
    all: ["payments"] as const,
    lists: () => [...queryKeys.payments.all, "list"] as const,
    list: (filters: PaymentFilters) =>
      [...queryKeys.payments.lists(), filters] as const,
    details: () => [...queryKeys.payments.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.payments.details(), id] as const,
    byTuition: (tuitionId: string) =>
      [...queryKeys.payments.all, "by-tuition", tuitionId] as const,
  },

  reports: {
    all: ["reports"] as const,
    overdue: (filters: OverdueFilters) =>
      [...queryKeys.reports.all, "overdue", filters] as const,
    classSummary: (filters: ClassSummaryFilters) =>
      [...queryKeys.reports.all, "class-summary", filters] as const,
  },

  discounts: {
    all: ["discounts"] as const,
    lists: () => [...queryKeys.discounts.all, "list"] as const,
    list: (filters: DiscountFilters) =>
      [...queryKeys.discounts.lists(), filters] as const,
    details: () => [...queryKeys.discounts.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.discounts.details(), id] as const,
  },

  // Student Portal
  studentAuth: {
    all: ["student-auth"] as const,
    me: () => [...queryKeys.studentAuth.all, "me"] as const,
  },

  studentTuitions: {
    all: ["student-tuitions"] as const,
    list: () => [...queryKeys.studentTuitions.all, "list"] as const,
  },

  studentOnlinePayments: {
    all: ["student-online-payments"] as const,
    lists: () => [...queryKeys.studentOnlinePayments.all, "list"] as const,
    list: (filters?: { status?: string }) =>
      [...queryKeys.studentOnlinePayments.lists(), filters] as const,
    details: () => [...queryKeys.studentOnlinePayments.all, "detail"] as const,
    detail: (id: string) =>
      [...queryKeys.studentOnlinePayments.details(), id] as const,
    config: () => [...queryKeys.studentOnlinePayments.all, "config"] as const,
  },

  adminOnlinePayments: {
    all: ["admin-online-payments"] as const,
    lists: () => [...queryKeys.adminOnlinePayments.all, "list"] as const,
    list: (filters: OnlinePaymentFilters) =>
      [...queryKeys.adminOnlinePayments.lists(), filters] as const,
  },

  paymentSettings: {
    all: ["payment-settings"] as const,
  },

  // Admin Phase 3
  studentAccounts: {
    all: ["student-accounts"] as const,
    lists: () => [...queryKeys.studentAccounts.all, "list"] as const,
    list: (filters: StudentAccountFilters) =>
      [...queryKeys.studentAccounts.lists(), filters] as const,
  },

  notifications: {
    all: ["notifications"] as const,
    lists: () => [...queryKeys.notifications.all, "list"] as const,
    list: (filters: NotificationFilters) =>
      [...queryKeys.notifications.lists(), filters] as const,
  },

  rateLimits: {
    all: ["rate-limits"] as const,
    list: (filters: RateLimitFilters) =>
      [...queryKeys.rateLimits.all, "list", filters] as const,
  },
} as const;
