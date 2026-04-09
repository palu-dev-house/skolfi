import { z } from "zod";

export const classAcademicSchema = z.object({
  academicYearId: z.string().min(1),
  grade: z.coerce.number().int().min(1).max(12),
  section: z.string().min(1),
  paymentFrequency: z
    .enum(["MONTHLY", "QUARTERLY", "SEMESTER"])
    .optional()
    .default("MONTHLY"),
});

export const classAcademicUpdateSchema = classAcademicSchema.partial();

export type ClassAcademicInput = z.infer<typeof classAcademicSchema>;
