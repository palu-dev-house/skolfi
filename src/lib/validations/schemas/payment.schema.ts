import { z } from "zod";

const decimalString = z.string().regex(/^\d+(\.\d{1,2})?$/, "invalid decimal");

export const paymentItemSchema = z
  .object({
    tuitionId: z.string().uuid().optional(),
    feeBillId: z.string().uuid().optional(),
    serviceFeeBillId: z.string().uuid().optional(),
    amount: decimalString,
    scholarshipAmount: decimalString.optional(),
  })
  .superRefine((item, ctx) => {
    const set = [item.tuitionId, item.feeBillId, item.serviceFeeBillId].filter(
      Boolean,
    );
    if (set.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Exactly one of tuitionId, feeBillId, serviceFeeBillId required",
      });
    }
    if (item.scholarshipAmount && !item.tuitionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scholarshipAmount"],
        message: "scholarshipAmount only valid with tuitionId",
      });
    }
  });

export const paymentSchema = z.object({
  studentId: z.string().min(1),
  paymentDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  items: z.array(paymentItemSchema).min(1).max(50),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
export type PaymentItemInput = z.infer<typeof paymentItemSchema>;
