"use client";

import { Paper } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ClassAcademicForm from "@/components/forms/ClassAcademicForm";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useCreateClassAcademic } from "@/hooks/api/useClassAcademics";

export default function NewClassPage() {
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
}
