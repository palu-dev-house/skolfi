import { z } from "zod";

export const bankAccountSchema = z.object({
  bankCode: z.string().min(1),
  bankName: z.string().min(1),
  accountNumber: z.string().min(1),
  accountName: z.string().min(1),
  isActive: z.boolean().optional().default(true),
});

export type BankAccountInput = z.infer<typeof bankAccountSchema>;
