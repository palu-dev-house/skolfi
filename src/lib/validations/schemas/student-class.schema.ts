import { z } from "zod";

export const studentClassAssignSchema = z.object({
  classAcademicId: z.string().min(1),
  studentNisList: z.array(z.string().min(1)).min(1),
});

export const studentClassRemoveSchema = z.object({
  classAcademicId: z.string().min(1),
  studentNisList: z.array(z.string().min(1)).min(1),
});

export type StudentClassAssignInput = z.infer<typeof studentClassAssignSchema>;
