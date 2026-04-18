import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateDaysOverdue,
  calculateOverdueSummary,
  type OverdueItem,
} from "@/lib/business-logic/overdue-calculator";

describe("calculateDaysOverdue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 15, 10, 30, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for a future due date", () => {
    expect(calculateDaysOverdue(new Date(2026, 3, 20))).toBe(0);
  });

  it("returns 0 when due date is today", () => {
    expect(calculateDaysOverdue(new Date(2026, 3, 15))).toBe(0);
  });

  it("returns the day difference for past due dates", () => {
    expect(calculateDaysOverdue(new Date(2026, 3, 10))).toBe(5);
    expect(calculateDaysOverdue(new Date(2026, 2, 15))).toBe(31);
  });

  it("ignores the time portion of due date", () => {
    expect(calculateDaysOverdue(new Date(2026, 3, 14, 23, 59, 59))).toBe(1);
  });
});

describe("calculateOverdueSummary", () => {
  const makeItem = (overrides: Partial<OverdueItem> = {}): OverdueItem => ({
    tuitionId: "t-1",
    studentId: "s-1",
    studentNis: "2024001",
    schoolLevel: "SD",
    studentName: "Student 1",
    parentPhone: "0812",
    className: "VII-A",
    grade: 7,
    section: "A",
    period: "JULY",
    year: 2026,
    feeAmount: 500_000,
    paidAmount: 0,
    outstandingAmount: 500_000,
    dueDate: new Date("2026-01-01"),
    daysOverdue: 100,
    scholarshipAmount: 0,
    discountAmount: 0,
    ...overrides,
  });

  it("returns zeroed summary for empty list", () => {
    expect(calculateOverdueSummary([])).toEqual({
      totalStudents: 0,
      totalOverdueAmount: 0,
      totalOverdueRecords: 0,
    });
  });

  it("counts distinct students across multiple records", () => {
    const items = [
      makeItem({ studentId: "s-1", tuitionId: "t-1" }),
      makeItem({ studentId: "s-1", tuitionId: "t-2" }),
      makeItem({ studentId: "s-2", tuitionId: "t-3" }),
    ];
    const summary = calculateOverdueSummary(items);
    expect(summary.totalStudents).toBe(2);
    expect(summary.totalOverdueRecords).toBe(3);
  });

  it("sums outstanding amounts across all records", () => {
    const items = [
      makeItem({ outstandingAmount: 100_000 }),
      makeItem({ outstandingAmount: 250_000, studentId: "s-2" }),
      makeItem({ outstandingAmount: 75_500, studentId: "s-3" }),
    ];
    expect(calculateOverdueSummary(items).totalOverdueAmount).toBe(425_500);
  });
});
