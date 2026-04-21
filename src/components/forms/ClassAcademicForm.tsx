"use client";

import {
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslations } from "next-intl";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { classAcademicSchema } from "@/lib/validations";
import { zodResolver } from "@/lib/validations/mantine-zod-resolver";
import { SCHOOL_LEVEL_GRADE_RANGE } from "@/lib/validations/schemas/class.schema";

type SchoolLevel = "TK" | "SD" | "SMP" | "SMA";

interface ClassAcademicFormValues {
  academicYearId: string;
  schoolLevel: SchoolLevel;
  grade: number;
  section: string;
}

interface ClassAcademicFormProps {
  initialData?: {
    academicYearId?: string;
    schoolLevel?: SchoolLevel;
    grade?: number;
    section?: string;
  };
  onSubmit: (data: ClassAcademicFormValues) => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

export default function ClassAcademicForm({
  initialData,
  onSubmit,
  isLoading,
  isEdit,
}: ClassAcademicFormProps) {
  const t = useTranslations();
  const { data: academicYearsData } = useAcademicYears({ limit: 100 });

  const form = useForm<ClassAcademicFormValues>({
    initialValues: {
      academicYearId: initialData?.academicYearId || "",
      schoolLevel: initialData?.schoolLevel || "SD",
      grade: initialData?.grade || 1,
      section: initialData?.section || "",
    },
    validate: zodResolver(classAcademicSchema, t),
  });

  const academicYearOptions =
    academicYearsData?.academicYears.map((ay) => ({
      value: ay.id,
      label: `${ay.year}${ay.isActive ? ` (${t("academicYear.statuses.active")})` : ""}`,
    })) || [];

  const gradeRange = SCHOOL_LEVEL_GRADE_RANGE[form.values.schoolLevel];

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="md">
        <Select
          label={t("class.academicYear")}
          placeholder={t("class.selectAcademicYear")}
          data={academicYearOptions}
          required
          searchable
          {...form.getInputProps("academicYearId")}
        />
        <Select
          label={t("student.schoolLevel")}
          placeholder={t("student.schoolLevelPlaceholder")}
          required
          data={[
            { value: "TK", label: "TK" },
            { value: "SD", label: "SD" },
            { value: "SMP", label: "SMP" },
            { value: "SMA", label: "SMA" },
          ]}
          {...form.getInputProps("schoolLevel")}
          onChange={(value) => {
            const nextLevel = (value as SchoolLevel) || "SD";
            form.setFieldValue("schoolLevel", nextLevel);
            const nextRange = SCHOOL_LEVEL_GRADE_RANGE[nextLevel];
            if (
              form.values.grade < nextRange.min ||
              form.values.grade > nextRange.max
            ) {
              form.setFieldValue("grade", nextRange.min);
            }
          }}
        />
        <Group grow>
          <NumberInput
            label={t("class.grade")}
            placeholder={t("class.gradePlaceholder")}
            required
            min={gradeRange.min}
            max={gradeRange.max}
            {...form.getInputProps("grade")}
          />
          <TextInput
            label={t("class.section")}
            placeholder={t("class.sectionPlaceholder")}
            required
            {...form.getInputProps("section")}
          />
        </Group>

        <Button type="submit" loading={isLoading}>
          {isEdit ? t("common.update") : t("common.create")}
        </Button>
      </Stack>
    </form>
  );
}
