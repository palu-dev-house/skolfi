import { z } from "zod";

export const discountSchema = z.object({
  name: z.string().min(1),
  discountAmount: z.coerce.number().positive(),
  reason: z.string().optional(),
  academicYearId: z.string().min(1),
  classAcademicId: z.string().optional(),
  targetPeriods: z.array(z.string()).min(1),
  isActive: z.boolean().optional().default(true),
});

export const discountUpdateSchema = discountSchema.partial();

export const discountApplySchema = z.object({
  discountId: z.string().min(1),
});

export type DiscountInput = z.infer<typeof discountSchema>;
