import { describe, expect, it } from "vitest";
import { studentSchema, studentUpdateSchema } from "../schemas/student.schema";

// ============================================
// studentSchema - basic validation
// ============================================

describe("studentSchema", () => {
  const validStudent = {
    nis: "2024001",
    schoolLevel: "SD",
    name: "John Doe",
    address: "123 Main St",
    parentName: "Jane Doe",
    parentPhone: "081234567890",
    startJoinDate: "2024-07-01",
  };

  it("accepts valid student data", () => {
    const result = studentSchema.safeParse(validStudent);
    expect(result.success).toBe(true);
  });

  // ============================================
  // schoolLevel validation (new field from migration)
  // ============================================

  it("accepts SD school level", () => {
    const result = studentSchema.safeParse({
      ...validStudent,
      schoolLevel: "SD",
    });
    expect(result.success).toBe(true);
  });

  it("accepts SMP school level", () => {
    const result = studentSchema.safeParse({
      ...validStudent,
      schoolLevel: "SMP",
    });
    expect(result.success).toBe(true);
  });

  it("accepts SMA school level", () => {
    const result = studentSchema.safeParse({
      ...validStudent,
      schoolLevel: "SMA",
    });
    expect(result.success).toBe(true);
  });

  it("accepts TK school level", () => {
    const result = studentSchema.safeParse({
      ...validStudent,
      schoolLevel: "TK",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid school level", () => {
    const result = studentSchema.safeParse({
      ...validStudent,
      schoolLevel: "UNIV",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing school level", () => {
    const { schoolLevel: _, ...noLevel } = validStudent;
    const result = studentSchema.safeParse(noLevel);
    expect(result.success).toBe(false);
  });

  it("rejects empty school level", () => {
    const result = studentSchema.safeParse({
      ...validStudent,
      schoolLevel: "",
    });
    expect(result.success).toBe(false);
  });

  // ============================================
  // NIS validation
  // ============================================

  it("rejects empty NIS", () => {
    const result = studentSchema.safeParse({ ...validStudent, nis: "" });
    expect(result.success).toBe(false);
  });

  it("accepts any non-empty NIS string", () => {
    const result = studentSchema.safeParse({ ...validStudent, nis: "ABC123" });
    expect(result.success).toBe(true);
  });

  // ============================================
  // NIS + schoolLevel duplicate scenario
  // ============================================

  it("allows same NIS with different school levels (schema level)", () => {
    // Both should parse successfully - duplication check is at DB level
    const sdResult = studentSchema.safeParse({
      ...validStudent,
      nis: "2024001",
      schoolLevel: "SD",
    });
    const smpResult = studentSchema.safeParse({
      ...validStudent,
      nis: "2024001",
      schoolLevel: "SMP",
    });

    expect(sdResult.success).toBe(true);
    expect(smpResult.success).toBe(true);
  });

  // ============================================
  // Phone number validation
  // ============================================

  it("rejects phone number shorter than 10 chars", () => {
    const result = studentSchema.safeParse({
      ...validStudent,
      parentPhone: "08123",
    });
    expect(result.success).toBe(false);
  });

  it("accepts phone number with 10+ characters", () => {
    const result = studentSchema.safeParse({
      ...validStudent,
      parentPhone: "0812345678",
    });
    expect(result.success).toBe(true);
  });

  // ============================================
  // Date coercion
  // ============================================

  it("coerces date string to Date object", () => {
    const result = studentSchema.safeParse(validStudent);
    if (result.success) {
      expect(result.data.startJoinDate).toBeInstanceOf(Date);
    }
  });

  it("rejects invalid date", () => {
    const result = studentSchema.safeParse({
      ...validStudent,
      startJoinDate: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================
// studentUpdateSchema
// ============================================

describe("studentUpdateSchema", () => {
  it("allows partial updates", () => {
    const result = studentUpdateSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("allows empty object (no fields to update)", () => {
    const result = studentUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("does not allow NIS in update (omitted from schema)", () => {
    const result = studentUpdateSchema.safeParse({ nis: "9999999" });
    // NIS is omitted, so it should be stripped but parse should succeed
    if (result.success) {
      expect("nis" in result.data).toBe(false);
    }
  });

  it("validates schoolLevel enum in partial update", () => {
    const result = studentUpdateSchema.safeParse({ schoolLevel: "SMP" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid schoolLevel in partial update", () => {
    const result = studentUpdateSchema.safeParse({ schoolLevel: "INVALID" });
    expect(result.success).toBe(false);
  });
});
