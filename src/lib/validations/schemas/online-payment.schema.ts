import { z } from "zod";

export const createOnlinePaymentSchema = z.object({
  tuitionIds: z.array(z.string().uuid()).min(1, "Select at least one tuition"),
});

export type CreateOnlinePaymentInput = z.infer<
  typeof createOnlinePaymentSchema
>;

export const cancelOnlinePaymentSchema = z.object({
  onlinePaymentId: z.string().uuid(),
});

export type CancelOnlinePaymentInput = z.infer<
  typeof cancelOnlinePaymentSchema
>;

export const paymentSettingSchema = z.object({
  onlinePaymentEnabled: z.boolean(),
  maintenanceMessage: z.string().nullable().optional(),
});

export type PaymentSettingInput = z.infer<typeof paymentSettingSchema>;
