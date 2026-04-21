"use client";

import { Button, Select, Stack, Textarea, TextInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useTranslations } from "next-intl";
import { studentSchema } from "@/lib/validations";
import { zodResolver } from "@/lib/validations/mantine-zod-resolver";

type SchoolLevel = "TK" | "SD" | "SMP" | "SMA";

interface StudentFormValues {
  nis: string;
  schoolLevel: SchoolLevel;
  name: string;
  address: string;
  parentName: string;
  parentPhone: string;
  startJoinDate: string | null;
}

interface StudentFormProps {
  initialData?: {
    nis?: string;
    schoolLevel?: SchoolLevel;
    name?: string;
    address?: string;
    parentName?: string;
    parentPhone?: string;
    startJoinDate?: string | Date;
  };
  onSubmit: (data: {
    nis: string;
    schoolLevel: SchoolLevel;
    name: string;
    address: string;
    parentName: string;
    parentPhone: string;
    startJoinDate: string;
  }) => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

export default function StudentForm({
  initialData,
  onSubmit,
  isLoading,
  isEdit,
}: StudentFormProps) {
  const t = useTranslations();

  const form = useForm<StudentFormValues>({
    initialValues: {
      nis: initialData?.nis || "",
      schoolLevel: initialData?.schoolLevel || "SD",
      name: initialData?.name || "",
      address: initialData?.address || "",
      parentName: initialData?.parentName || "",
      parentPhone: initialData?.parentPhone || "",
      startJoinDate: initialData?.startJoinDate
        ? new Date(initialData.startJoinDate).toISOString()
        : null,
    },
    validate: zodResolver(studentSchema, t),
  });

  const handleSubmit = (values: StudentFormValues) => {
    if (!values.startJoinDate) return;
    const startJoinDate: string =
      typeof values.startJoinDate === "string" ? values.startJoinDate : "";

    onSubmit({
      ...values,
      startJoinDate,
    });
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label={t("student.nis")}
          placeholder={t("student.nisPlaceholder")}
          required
          disabled={isEdit}
          {...form.getInputProps("nis")}
        />
        <Select
          label={t("student.schoolLevel")}
          placeholder={t("student.schoolLevelPlaceholder")}
          required
          disabled={isEdit}
          data={[
            { value: "TK", label: "TK" },
            { value: "SD", label: "SD" },
            { value: "SMP", label: "SMP" },
            { value: "SMA", label: "SMA" },
          ]}
          {...form.getInputProps("schoolLevel")}
        />
        <TextInput
          label={t("student.name")}
          placeholder={t("student.namePlaceholder")}
          required
          {...form.getInputProps("name")}
        />
        <Textarea
          label={t("student.address")}
          placeholder={t("student.addressPlaceholder")}
          required
          {...form.getInputProps("address")}
        />
        <TextInput
          label={t("student.parentName")}
          placeholder={t("student.parentNamePlaceholder")}
          required
          {...form.getInputProps("parentName")}
        />
        <TextInput
          label={t("student.parentPhone")}
          placeholder={t("student.parentPhonePlaceholder")}
          required
          {...form.getInputProps("parentPhone")}
        />
        <DatePickerInput
          label={t("student.joinDate")}
          placeholder="DD/MM/YYYY"
          required
          valueFormat="DD/MM/YYYY"
          {...form.getInputProps("startJoinDate")}
        />
        <Button type="submit" loading={isLoading}>
          {isEdit ? t("common.update") : t("common.create")}
        </Button>
      </Stack>
    </form>
  );
}
