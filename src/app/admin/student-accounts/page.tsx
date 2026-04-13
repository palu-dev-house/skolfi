"use client";

import { useTranslations } from "next-intl";
import StudentAccountTable from "@/components/tables/StudentAccountTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";

export default function StudentAccountsPage() {
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
}
