"use client";

import { LoadingOverlay, Paper, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use } from "react";
import ClassAcademicForm from "@/components/forms/ClassAcademicForm";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import {
  useClassAcademic,
  useUpdateClassAcademic,
} from "@/hooks/api/useClassAcademics";

export default function EditClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations();
  const { id } = use(params);
  const router = useRouter();
  const { data: classAcademic, isLoading } = useClassAcademic(id);
  const updateClass = useUpdateClassAcademic();

  const handleSubmit = (data: {
    academicYearId: string;
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
}
