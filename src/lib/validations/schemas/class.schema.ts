import { z } from "zod";

export const SCHOOL_LEVEL_GRADE_RANGE = {
  TK: { min: 1, max: 3 },
  SD: { min: 1, max: 6 },
  SMP: { min: 7, max: 9 },
  SMA: { min: 10, max: 12 },
} as const;

export const classAcademicSchema = z
  .object({
    academicYearId: z.string().min(1),
    schoolLevel: z.enum(["TK", "SD", "SMP", "SMA"]).default("SD"),
    grade: z.coerce.number().int().min(1).max(12),
    section: z.string().min(1),
    paymentFrequency: z
      .enum(["MONTHLY", "QUARTERLY", "SEMESTER"])
      .optional()
      .default("MONTHLY"),
  })
  .superRefine((value, ctx) => {
    const range = SCHOOL_LEVEL_GRADE_RANGE[value.schoolLevel];
    if (value.grade < range.min || value.grade > range.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["grade"],
        message: `Grade must be between ${range.min} and ${range.max} for ${value.schoolLevel}`,
      });
    }
  });

export const classAcademicUpdateSchema = z.object({
  academicYearId: z.string().min(1).optional(),
  schoolLevel: z.enum(["TK", "SD", "SMP", "SMA"]).optional(),
  grade: z.coerce.number().int().min(1).max(12).optional(),
  section: z.string().min(1).optional(),
  paymentFrequency: z.enum(["MONTHLY", "QUARTERLY", "SEMESTER"]).optional(),
});

export type ClassAcademicInput = z.infer<typeof classAcademicSchema>;
