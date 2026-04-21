"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface StudentClassFilters {
  page?: number;
  limit?: number;
  classAcademicId?: string;
  studentId?: string;
  academicYearId?: string;
  search?: string;
}

interface Student {
  id: string;
  nis: string;
  schoolLevel: "TK" | "SD" | "SMP" | "SMA";
  name: string;
  parentName: string;
  parentPhone: string;
  startJoinDate: string;
}

interface ClassInfo {
  id: string;
  className: string;
  grade: number;
  section: string;
  academicYear?: { year: string };
}

interface StudentClass {
  id: string;
  studentId: string;
  classAcademicId: string;
  enrolledAt: string;
  student: Student;
  classAcademic: ClassInfo;
}

interface StudentClassListResponse {
  success: boolean;
  data: {
    studentClasses: StudentClass[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface StudentsByClassResponse {
  success: boolean;
  data: {
    class: {
      id: string;
      className: string;
      grade: number;
      section: string;
      academicYear: string;
    };
    students: (Student & { enrolledAt: string })[];
    totalStudents: number;
  };
}

interface UnassignedStudentsResponse {
  success: boolean;
  data: {
    students: Student[];
    total: number;
  };
}

interface AssignStudentsResponse {
  success: boolean;
  data: {
    assigned: number;
    skipped: number;
    skippedNis: string[];
  };
}

// Query keys
export const studentClassKeys = {
  all: ["student-classes"] as const,
  lists: () => [...studentClassKeys.all, "list"] as const,
  list: (filters: StudentClassFilters) =>
    [...studentClassKeys.lists(), filters] as const,
  byClass: (classId: string) =>
    [...studentClassKeys.all, "by-class", classId] as const,
  unassigned: (filters: {
    classAcademicId?: string;
    academicYearId?: string;
    search?: string;
  }) => [...studentClassKeys.all, "unassigned", filters] as const,
};

// List student-class assignments
export function useStudentClasses(filters: StudentClassFilters = {}) {
  return useQuery({
    queryKey: studentClassKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<StudentClassListResponse>(
        "/student-classes",
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

// Get students by class
export function useStudentsByClass(classId: string) {
  return useQuery({
    queryKey: studentClassKeys.byClass(classId),
    queryFn: async () => {
      const { data } = await apiClient.get<StudentsByClassResponse>(
        `/student-classes/by-class/${classId}`,
      );
      return data.data;
    },
    enabled: !!classId,
  });
}

// Get unassigned students
export function useUnassignedStudents(filters: {
  classAcademicId?: string;
  academicYearId?: string;
  search?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: studentClassKeys.unassigned(filters),
    queryFn: async () => {
      const { data } = await apiClient.get<UnassignedStudentsResponse>(
        "/student-classes/unassigned",
        {
          params: filters as Record<
            string,
            string | number | boolean | undefined
          >,
        },
      );
      return data.data;
    },
    enabled: !!(filters.classAcademicId || filters.academicYearId),
  });
}

// Assign students to class
export function useAssignStudentsToClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      classAcademicId,
      studentIdList,
    }: {
      classAcademicId: string;
      studentIdList: string[];
    }) => {
      const { data } = await apiClient.post<AssignStudentsResponse>(
        "/student-classes",
        { classAcademicId, studentIdList },
      );
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: studentClassKeys.all });
      queryClient.invalidateQueries({
        queryKey: studentClassKeys.byClass(variables.classAcademicId),
      });
    },
  });
}

// Remove students from class
export function useRemoveStudentsFromClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      classAcademicId,
      studentIdList,
    }: {
      classAcademicId: string;
      studentIdList: string[];
    }) => {
      // Note: DELETE with body needs special handling
      const response = await fetch("/api/v1/student-classes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classAcademicId, studentIdList }),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to remove students");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: studentClassKeys.all });
      queryClient.invalidateQueries({
        queryKey: studentClassKeys.byClass(variables.classAcademicId),
      });
    },
  });
}

// Import students to classes from Excel
export function useImportStudentClasses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/v1/student-classes/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Import failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentClassKeys.all });
    },
  });
}

// Download template
export function useDownloadStudentClassTemplate() {
  const downloadTemplate = (academicYearId?: string) => {
    const params = new URLSearchParams();
    if (academicYearId) {
      params.set("academicYearId", academicYearId);
    }
    window.open(
      `/api/v1/student-classes/template?${params.toString()}`,
      "_blank",
    );
  };

  return { downloadTemplate };
}
