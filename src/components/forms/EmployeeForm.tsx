"use client";

import { Button, Select, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useTranslations } from "next-intl";
import { employeeSchema } from "@/lib/validations";
import { zodResolver } from "@/lib/validations/mantine-zod-resolver";

interface EmployeeFormValues {
  name: string;
  email: string;
  role: "ADMIN" | "CASHIER";
}

interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormValues>;
  onSubmit: (data: EmployeeFormValues) => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

export default function EmployeeForm({
  initialData,
  onSubmit,
  isLoading,
  isEdit,
}: EmployeeFormProps) {
  const t = useTranslations();

  const form = useForm<EmployeeFormValues>({
    initialValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      role: initialData?.role || "CASHIER",
    },
    validate: zodResolver(employeeSchema, t),
  });

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="md">
        <TextInput
          label={t("employee.name")}
          placeholder={t("employee.namePlaceholder")}
          required
          {...form.getInputProps("name")}
        />
        <TextInput
          label={t("employee.email")}
          placeholder={t("employee.emailPlaceholder")}
          required
          {...form.getInputProps("email")}
        />
        <Select
          label={t("employee.role")}
          data={[
            { value: "ADMIN", label: t("employee.roles.ADMIN") },
            { value: "CASHIER", label: t("employee.roles.CASHIER") },
          ]}
          required
          {...form.getInputProps("role")}
        />
        <Button type="submit" loading={isLoading}>
          {isEdit ? t("common.update") : t("common.create")}
        </Button>
      </Stack>
    </form>
  );
}
