import { LoadingOverlay, Paper, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import AcademicYearForm from "@/components/forms/AcademicYearForm";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import {
  useAcademicYear,
  useUpdateAcademicYear,
} from "@/hooks/api/useAcademicYears";
import type { NextPageWithLayout } from "@/lib/page-types";

const EditAcademicYearPage: NextPageWithLayout =
  function EditAcademicYearPage() {
    const t = useTranslations();
    const router = useRouter();
    const { id } = router.query as { id: string };
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
  };
EditAcademicYearPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default EditAcademicYearPage;
