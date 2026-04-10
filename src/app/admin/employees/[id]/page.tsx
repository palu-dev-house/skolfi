"use client";

import { LoadingOverlay, Paper, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { use } from "react";
import EmployeeForm from "@/components/forms/EmployeeForm";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useEmployee, useUpdateEmployee } from "@/hooks/api/useEmployees";

export default function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations();
  const { id } = use(params);
  const router = useRouter();
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
}
