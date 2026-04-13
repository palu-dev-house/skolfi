import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import AcademicYearTable from "@/components/tables/AcademicYearTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import type { NextPageWithLayout } from "@/lib/page-types";

const AcademicYearsPage: NextPageWithLayout = function AcademicYearsPage() {
  const router = useRouter();
  const t = useTranslations();

  return (
    <>
      <PageHeader
        title={t("academicYear.list")}
        description={t("academicYear.description")}
        actions={
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => router.push("/admin/academic-years/new")}
          >
            {t("academicYear.add")}
          </Button>
        }
      />
      <AcademicYearTable />
    </>
  );
};
AcademicYearsPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default AcademicYearsPage;
