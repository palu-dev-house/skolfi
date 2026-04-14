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
  status?: "active" | "exited" | "all";
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
  status?: "UNPAID" | "PAID" | "PARTIAL" | "VOID";
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

export interface FeeServiceFilters {
  page?: number;
  limit?: number;
  academicYearId?: string;
  category?: "TRANSPORT" | "ACCOMMODATION";
  isActive?: boolean;
  search?: string;
}

export interface FeeSubscriptionFilters {
  page?: number;
  limit?: number;
  studentNis?: string;
  feeServiceId?: string;
  active?: boolean;
}

export interface FeeBillFilters {
  page?: number;
  limit?: number;
  studentNis?: string;
  feeServiceId?: string;
  period?: string;
  year?: number;
  status?: "UNPAID" | "PARTIAL" | "PAID" | "VOID";
}

export interface ServiceFeeFilters {
  page?: number;
  limit?: number;
  classAcademicId?: string;
  isActive?: boolean;
  search?: string;
}

export interface ServiceFeeBillFilters {
  page?: number;
  limit?: number;
  studentNis?: string;
  classAcademicId?: string;
  serviceFeeId?: string;
  period?: string;
  year?: number;
  status?: "UNPAID" | "PARTIAL" | "PAID" | "VOID";
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

  feeServices: {
    all: ["fee-services"] as const,
    lists: () => [...queryKeys.feeServices.all, "list"] as const,
    list: (filters: FeeServiceFilters) =>
      [...queryKeys.feeServices.lists(), filters] as const,
    details: () => [...queryKeys.feeServices.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.feeServices.details(), id] as const,
    prices: (id: string) =>
      [...queryKeys.feeServices.detail(id), "prices"] as const,
  },

  feeSubscriptions: {
    all: ["fee-subscriptions"] as const,
    lists: () => [...queryKeys.feeSubscriptions.all, "list"] as const,
    list: (filters: FeeSubscriptionFilters) =>
      [...queryKeys.feeSubscriptions.lists(), filters] as const,
    details: () => [...queryKeys.feeSubscriptions.all, "detail"] as const,
    detail: (id: string) =>
      [...queryKeys.feeSubscriptions.details(), id] as const,
  },

  feeBills: {
    all: ["fee-bills"] as const,
    lists: () => [...queryKeys.feeBills.all, "list"] as const,
    list: (filters: FeeBillFilters) =>
      [...queryKeys.feeBills.lists(), filters] as const,
    details: () => [...queryKeys.feeBills.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.feeBills.details(), id] as const,
    byStudent: (nis: string) =>
      [...queryKeys.feeBills.all, "by-student", nis] as const,
  },

  serviceFees: {
    all: ["service-fees"] as const,
    lists: () => [...queryKeys.serviceFees.all, "list"] as const,
    list: (filters: ServiceFeeFilters) =>
      [...queryKeys.serviceFees.lists(), filters] as const,
    details: () => [...queryKeys.serviceFees.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.serviceFees.details(), id] as const,
  },

  serviceFeeBills: {
    all: ["service-fee-bills"] as const,
    lists: () => [...queryKeys.serviceFeeBills.all, "list"] as const,
    list: (filters: ServiceFeeBillFilters) =>
      [...queryKeys.serviceFeeBills.lists(), filters] as const,
    details: () => [...queryKeys.serviceFeeBills.all, "detail"] as const,
    detail: (id: string) =>
      [...queryKeys.serviceFeeBills.details(), id] as const,
    byStudent: (nis: string) =>
      [...queryKeys.serviceFeeBills.all, "by-student", nis] as const,
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

  studentOutstanding: {
    all: ["student-outstanding"] as const,
    list: () => [...queryKeys.studentOutstanding.all, "list"] as const,
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
