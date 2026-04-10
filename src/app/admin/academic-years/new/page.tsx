"use client";

import { Paper } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import AcademicYearForm from "@/components/forms/AcademicYearForm";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useCreateAcademicYear } from "@/hooks/api/useAcademicYears";

export default function NewAcademicYearPage() {
  const t = useTranslations();
  const router = useRouter();
  const createAcademicYear = useCreateAcademicYear();

  const handleSubmit = (data: {
    year: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }) => {
    createAcademicYear.mutate(data, {
      onSuccess: () => {
        notifications.show({
          title: t("common.success"),
          message: t("academicYear.createSuccess"),
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
    });
  };

  return (
    <>
      <PageHeader
        title={t("academicYear.add")}
        description={t("academicYear.addDescription")}
      />
      <Paper withBorder p="lg">
        <AcademicYearForm
          onSubmit={handleSubmit}
          isLoading={createAcademicYear.isPending}
        />
      </Paper>
    </>
  );
}
