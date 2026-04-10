"use client";

import { LoadingOverlay, Paper, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use } from "react";
import AcademicYearForm from "@/components/forms/AcademicYearForm";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import {
  useAcademicYear,
  useUpdateAcademicYear,
} from "@/hooks/api/useAcademicYears";

export default function EditAcademicYearPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations();
  const { id } = use(params);
  const router = useRouter();
  const { data: academicYear, isLoading } = useAcademicYear(id);
  const updateAcademicYear = useUpdateAcademicYear();

  const handleSubmit = (data: {
    year: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }) => {
    updateAcademicYear.mutate(
      { id, updates: data },
      {
        onSuccess: () => {
          notifications.show({
            title: t("common.success"),
            message: t("academicYear.updateSuccess"),
            color: "green",
          });
          router.push("/admin/academic-years");
        },
        onError: (error) => {
          notifications.show({
            title: t("common.error"),
            message: error.message,
            color: "red",
          });
        },
      },
    );
  };

  if (isLoading) return <LoadingOverlay visible />;
  if (!academicYear) return <Text>{t("academicYear.notFoundMessage")}</Text>;

  return (
    <>
      <PageHeader
        title={t("academicYear.edit")}
        description={t("academicYear.editDescription", {
          year: academicYear.year,
        })}
      />
      <Paper withBorder p="lg">
        <AcademicYearForm
          initialData={academicYear}
          onSubmit={handleSubmit}
          isLoading={updateAcademicYear.isPending}
          isEdit
        />
      </Paper>
    </>
  );
}
