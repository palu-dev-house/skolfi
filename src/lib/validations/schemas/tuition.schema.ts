import { z } from "zod";

export const tuitionGenerateSchema = z.object({
  classAcademicId: z.string().min(1),
  monthlyFee: z.coerce.number().positive(),
  quarterlyFee: z.coerce.number().positive().optional(),
  semesterFee: z.coerce.number().positive().optional(),
});

export const tuitionUpdateSchema = z.object({
  feeAmount: z.coerce.number().positive().optional(),
  dueDate: z.coerce.date().optional(),
});

export type TuitionGenerateInput = z.infer<typeof tuitionGenerateSchema>;
