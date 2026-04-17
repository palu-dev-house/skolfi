import { z } from "zod";

export const studentSchema = z.object({
  nis: z.string().min(1),
  schoolLevel: z.enum(["SD", "SMP", "SMA"]),
  nik: z.string().length(16),
  name: z.string().min(1),
  address: z.string().min(1),
  parentName: z.string().min(1),
  parentPhone: z.string().min(10),
  startJoinDate: z.coerce.date(),
});

export const studentUpdateSchema = studentSchema.partial().omit({ nis: true });

export type StudentInput = z.infer<typeof studentSchema>;
