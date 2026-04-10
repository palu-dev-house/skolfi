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

export const tuitionMassUpdateSchema = z.object({
  tuitionIds: z.array(z.string().uuid()).min(1, "Select at least one tuition"),
  status: z.enum(["UNPAID", "PAID", "PARTIAL", "VOID"]),
});

export type TuitionGenerateInput = z.infer<typeof tuitionGenerateSchema>;
export type TuitionMassUpdateInput = z.infer<typeof tuitionMassUpdateSchema>;
