import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import StudentAccountTable from "@/components/tables/StudentAccountTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import type { NextPageWithLayout } from "@/lib/page-types";

const StudentAccountsPage: NextPageWithLayout = function StudentAccountsPage() {
  const t = useTranslations();

  return (
    <>
      <PageHeader
        title={t("studentAccount.title")}
        description={t("studentAccount.description")}
      />
      <StudentAccountTable />
    </>
  );
};
StudentAccountsPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default StudentAccountsPage;
