import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import EmployeeTable from "@/components/tables/EmployeeTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import type { NextPageWithLayout } from "@/lib/page-types";

const EmployeesPage: NextPageWithLayout = function EmployeesPage() {
  const t = useTranslations();
  const router = useRouter();

  return (
    <>
      <PageHeader
        title={t("employee.list")}
        description={t("employee.title")}
        actions={
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => router.push("/admin/employees/new")}
          >
            {t("employee.add")}
          </Button>
        }
      />
      <EmployeeTable />
    </>
  );
};
EmployeesPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default EmployeesPage;
