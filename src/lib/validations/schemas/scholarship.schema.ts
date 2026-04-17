import { z } from "zod";

export const scholarshipSchema = z.object({
  studentId: z.string().min(1),
  classAcademicId: z.string().min(1),
  nominal: z.coerce.number().positive(),
  scholarshipName: z.string().min(1),
  scholarshipType: z
    .enum(["Academic", "Sports", "Arts", "NeedBased", "Merit", "Other"])
    .optional()
    .default("Academic"),
  isFullScholarship: z.boolean().optional().default(false),
});

export type ScholarshipInput = z.infer<typeof scholarshipSchema>;
