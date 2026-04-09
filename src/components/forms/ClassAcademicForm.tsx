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

interface ClassAcademicFormValues {
  academicYearId: string;
  grade: number;
  section: string;
}

interface ClassAcademicFormProps {
  initialData?: {
    academicYearId?: string;
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
        <Group grow>
          <NumberInput
            label={t("class.grade")}
            placeholder={t("class.gradePlaceholder")}
            required
            min={1}
            max={12}
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
