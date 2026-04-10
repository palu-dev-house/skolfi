"use client";

import { Paper } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import EmployeeForm from "@/components/forms/EmployeeForm";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useCreateEmployee } from "@/hooks/api/useEmployees";

export default function NewEmployeePage() {
  const t = useTranslations();
  const router = useRouter();
  const createEmployee = useCreateEmployee();

  const handleSubmit = (data: {
    name: string;
    email: string;
    role: "ADMIN" | "CASHIER";
  }) => {
    createEmployee.mutate(data, {
      onSuccess: () => {
        notifications.show({
          title: t("common.success"),
          message: t("employee.defaultPasswordNote"),
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
    });
  };

  return (
    <>
      <PageHeader
        title={t("employee.add")}
        description={t("employee.addDescription")}
      />
      <Paper withBorder p="lg">
        <EmployeeForm
          onSubmit={handleSubmit}
          isLoading={createEmployee.isPending}
        />
      </Paper>
    </>
  );
}
