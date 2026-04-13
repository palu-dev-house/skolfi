import { Paper } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import AcademicYearForm from "@/components/forms/AcademicYearForm";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useCreateAcademicYear } from "@/hooks/api/useAcademicYears";
import type { NextPageWithLayout } from "@/lib/page-types";

const NewAcademicYearPage: NextPageWithLayout = function NewAcademicYearPage() {
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
};
NewAcademicYearPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default NewAcademicYearPage;
