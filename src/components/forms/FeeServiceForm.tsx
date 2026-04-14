"use client";

import {
  Button,
  Group,
  Select,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslations } from "next-intl";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";

export interface FeeServiceFormValues {
  name: string;
  category: "TRANSPORT" | "ACCOMMODATION";
  academicYearId: string;
  description: string;
}

interface Props {
  initialValues?: Partial<FeeServiceFormValues>;
  onSubmit: (values: FeeServiceFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
  disableAcademicYear?: boolean;
}

export default function FeeServiceForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading,
  disableAcademicYear,
}: Props) {
  const t = useTranslations();
  const { data: ayData } = useAcademicYears({ limit: 100 });
  const activeYear = ayData?.academicYears.find((ay) => ay.isActive);

  const form = useForm<FeeServiceFormValues>({
    initialValues: {
      name: initialValues?.name ?? "",
      category: initialValues?.category ?? "TRANSPORT",
      academicYearId: initialValues?.academicYearId ?? activeYear?.id ?? "",
      description: initialValues?.description ?? "",
    },
    validate: {
      name: (v) => (v.trim() ? null : t("common.required")),
      academicYearId: (v) => (v ? null : t("common.required")),
    },
  });

  const yearOptions =
    ayData?.academicYears.map((ay) => ({
      value: ay.id,
      label: `${ay.year}${ay.isActive ? ` (${t("common.active")})` : ""}`,
    })) ?? [];

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="md">
        <TextInput
          label={t("feeService.name")}
          placeholder={t("feeService.namePlaceholder")}
          required
          {...form.getInputProps("name")}
        />
        <Select
          label={t("feeService.category.label")}
          required
          data={[
            { value: "TRANSPORT", label: t("feeService.category.transport") },
            {
              value: "ACCOMMODATION",
              label: t("feeService.category.accommodation"),
            },
          ]}
          {...form.getInputProps("category")}
        />
        <Select
          label={t("feeService.academicYear")}
          required
          disabled={disableAcademicYear}
          data={yearOptions}
          {...form.getInputProps("academicYearId")}
        />
        <Textarea
          label={t("feeService.description")}
          rows={3}
          {...form.getInputProps("description")}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={isLoading}>
            {t("common.save")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
