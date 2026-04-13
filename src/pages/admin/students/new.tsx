import { Paper } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import StudentForm from "@/components/forms/StudentForm";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useCreateStudent } from "@/hooks/api/useStudents";
import type { NextPageWithLayout } from "@/lib/page-types";

const NewStudentPage: NextPageWithLayout = function NewStudentPage() {
  const t = useTranslations();
  const router = useRouter();
  const createStudent = useCreateStudent();

  const handleSubmit = (data: {
    nis: string;
    nik: string;
    name: string;
    address: string;
    parentName: string;
    parentPhone: string;
    startJoinDate: string;
  }) => {
    createStudent.mutate(data, {
      onSuccess: () => {
        notifications.show({
          title: t("common.success"),
          message: t("student.createSuccess"),
          color: "green",
        });
        router.push("/admin/students");
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
        title={t("student.add")}
        description={t("student.addDescription")}
      />
      <Paper withBorder p="lg">
        <StudentForm
          onSubmit={handleSubmit}
          isLoading={createStudent.isPending}
        />
      </Paper>
    </>
  );
};
NewStudentPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default NewStudentPage;
