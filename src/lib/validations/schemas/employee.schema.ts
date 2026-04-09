import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1).email(),
  role: z.enum(["ADMIN", "CASHIER"]),
});

export const employeeUpdateSchema = employeeSchema.partial();

export type EmployeeInput = z.infer<typeof employeeSchema>;
