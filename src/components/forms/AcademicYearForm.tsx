"use client";

import { Button, Checkbox, Stack, TextInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useTranslations } from "next-intl";
import { academicYearSchema } from "@/lib/validations";
import { zodResolver } from "@/lib/validations/mantine-zod-resolver";

interface AcademicYearFormValues {
  year: string;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
}

interface AcademicYearFormProps {
  initialData?: {
    year?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    isActive?: boolean;
  };
  onSubmit: (data: {
    year: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }) => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

export default function AcademicYearForm({
  initialData,
  onSubmit,
  isLoading,
  isEdit,
}: AcademicYearFormProps) {
  const t = useTranslations();

  const form = useForm<AcademicYearFormValues>({
    initialValues: {
      year: initialData?.year || "",
      startDate: initialData?.startDate
        ? new Date(initialData.startDate)
        : null,
      endDate: initialData?.endDate ? new Date(initialData.endDate) : null,
      isActive: initialData?.isActive || false,
    },
    validate: zodResolver(academicYearSchema, t),
  });

  const handleYearChange = (year: string) => {
    form.setFieldValue("year", year);
    const match = year.match(/^(\d{4})\/(\d{4})$/);
    if (match) {
      const [, startYear, endYear] = match;
      form.setFieldValue("startDate", new Date(Number(startYear), 6, 1));
      form.setFieldValue("endDate", new Date(Number(endYear), 5, 30));
    }
  };

  const handleSubmit = (values: AcademicYearFormValues) => {
    if (!values.startDate || !values.endDate) return;
    onSubmit({
      year: values.year,
      startDate: values.startDate.toISOString(),
      endDate: values.endDate.toISOString(),
      isActive: values.isActive,
    });
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label={t("academicYear.name")}
          placeholder={t("academicYear.yearPlaceholder")}
          required
          disabled={isEdit}
          {...form.getInputProps("year")}
          onChange={(e) => handleYearChange(e.currentTarget.value)}
        />
        <DatePickerInput
          label={t("academicYear.startDate")}
          placeholder="DD/MM/YYYY"
          required
          valueFormat="DD/MM/YYYY"
          {...form.getInputProps("startDate")}
        />
        <DatePickerInput
          label={t("academicYear.endDate")}
          placeholder="DD/MM/YYYY"
          required
          valueFormat="DD/MM/YYYY"
          {...form.getInputProps("endDate")}
        />
        <Checkbox
          label={t("academicYear.setAsActive")}
          {...form.getInputProps("isActive", { type: "checkbox" })}
        />
        <Button type="submit" loading={isLoading}>
          {isEdit ? t("common.update") : t("common.create")}
        </Button>
      </Stack>
    </form>
  );
}
