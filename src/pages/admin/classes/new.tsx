import { Paper } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import ClassAcademicForm from "@/components/forms/ClassAcademicForm";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useCreateClassAcademic } from "@/hooks/api/useClassAcademics";
import type { NextPageWithLayout } from "@/lib/page-types";

const NewClassPage: NextPageWithLayout = function NewClassPage() {
  const t = useTranslations();
  const router = useRouter();
  const createClass = useCreateClassAcademic();

  const handleSubmit = (data: {
    academicYearId: string;
    grade: number;
    section: string;
  }) => {
    createClass.mutate(data, {
      onSuccess: () => {
        notifications.show({
          title: t("common.success"),
          message: t("class.createSuccess"),
          color: "green",
        });
        router.push("/admin/classes");
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
        title={t("class.add")}
        description={t("class.addDescription")}
      />
      <Paper withBorder p="lg">
        <ClassAcademicForm
          onSubmit={handleSubmit}
          isLoading={createClass.isPending}
        />
      </Paper>
    </>
  );
};
NewClassPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default NewClassPage;
