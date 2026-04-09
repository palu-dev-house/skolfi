import { z } from "zod";

export const paymentSchema = z.object({
  tuitionId: z.string().min(1),
  amount: z.coerce.number().positive(),
  notes: z.string().optional(),
});

export const paymentRequestSchema = z.object({
  tuitionIds: z.array(z.string().min(1)).min(1),
  bankAccountId: z.string().min(1),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
export type PaymentRequestInput = z.infer<typeof paymentRequestSchema>;
