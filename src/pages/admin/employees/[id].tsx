import { LoadingOverlay, Paper, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import EmployeeForm from "@/components/forms/EmployeeForm";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useEmployee, useUpdateEmployee } from "@/hooks/api/useEmployees";
import type { NextPageWithLayout } from "@/lib/page-types";

const EditEmployeePage: NextPageWithLayout = function EditEmployeePage() {
  const t = useTranslations();
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { data: employee, isLoading } = useEmployee(id);
  const updateEmployee = useUpdateEmployee();

  const handleSubmit = (data: {
    name: string;
    email: string;
    role: "ADMIN" | "CASHIER";
  }) => {
    updateEmployee.mutate(
      { id, updates: data },
      {
        onSuccess: () => {
          notifications.show({
            title: t("common.success"),
            message: t("employee.updateSuccess"),
            color: "green",
          });
          router.push("/admin/employees");
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

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  if (!employee) {
    return <Text>{t("employee.notFoundMessage")}</Text>;
  }

  return (
    <>
      <PageHeader
        title={t("employee.edit")}
        description={t("employee.editDescription", { name: employee.name })}
      />
      <Paper withBorder p="lg">
        <EmployeeForm
          initialData={employee}
          onSubmit={handleSubmit}
          isLoading={updateEmployee.isPending}
          isEdit
        />
      </Paper>
    </>
  );
};
EditEmployeePage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default EditEmployeePage;
