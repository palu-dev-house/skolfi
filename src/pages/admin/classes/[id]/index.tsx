import { LoadingOverlay, Paper, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import ClassAcademicForm from "@/components/forms/ClassAcademicForm";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import {
  useClassAcademic,
  useUpdateClassAcademic,
} from "@/hooks/api/useClassAcademics";
import type { NextPageWithLayout } from "@/lib/page-types";

const EditClassPage: NextPageWithLayout = function EditClassPage() {
  const t = useTranslations();
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { data: classAcademic, isLoading } = useClassAcademic(id);
  const updateClass = useUpdateClassAcademic();

  const handleSubmit = (data: {
    academicYearId: string;
    schoolLevel: "TK" | "SD" | "SMP" | "SMA";
    grade: number;
    section: string;
  }) => {
    updateClass.mutate(
      { id, updates: data },
      {
        onSuccess: () => {
          notifications.show({
            title: t("common.success"),
            message: t("class.updateSuccess"),
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
      },
    );
  };

  if (isLoading) return <LoadingOverlay visible />;
  if (!classAcademic) return <Text>{t("class.notFoundMessage")}</Text>;

  return (
    <>
      <PageHeader
        title={t("class.edit")}
        description={t("class.editDescription", {
          name: classAcademic.className,
        })}
      />
      <Paper withBorder p="lg">
        <ClassAcademicForm
          initialData={classAcademic}
          onSubmit={handleSubmit}
          isLoading={updateClass.isPending}
          isEdit
        />
      </Paper>
    </>
  );
};
EditClassPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default EditClassPage;
