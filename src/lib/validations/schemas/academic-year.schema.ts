import { z } from "zod";

export const academicYearSchema = z.object({
  year: z.string().regex(/^\d{4}\/\d{4}$/).refine((val) => {
    const [start, end] = val.split("/").map(Number);
    return end === start + 1;
  }),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().optional().default(false),
});

export type AcademicYearInput = z.infer<typeof academicYearSchema>;
