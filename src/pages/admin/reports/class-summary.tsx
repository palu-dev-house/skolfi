import { Button, Group } from "@mantine/core";
import { IconAlertTriangle, IconFileSpreadsheet } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import ClassSummaryCards from "@/components/reports/ClassSummaryCards";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useExportClassSummary } from "@/hooks/api/useReports";
import type { NextPageWithLayout } from "@/lib/page-types";

const ClassSummaryPage: NextPageWithLayout = function ClassSummaryPage() {
  const router = useRouter();
  const t = useTranslations();
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const { exportReport } = useExportClassSummary();

  return (
    <>
      <PageHeader
        title={t("report.classSummary.title")}
        description={t("report.classSummary.description")}
        actions={
          <Group gap="sm">
            <Button
              variant="light"
              leftSection={<IconFileSpreadsheet size={18} />}
              onClick={() =>
                exportReport({ academicYearId: academicYearId ?? undefined })
              }
            >
              {t("report.classSummary.exportExcel")}
            </Button>
            <Button
              variant="light"
              color="red"
              leftSection={<IconAlertTriangle size={18} />}
              onClick={() => router.push("/admin/reports/overdue")}
            >
              {t("report.overdue.title")}
            </Button>
          </Group>
        }
      />
      <ClassSummaryCards
        academicYearId={academicYearId}
        onAcademicYearChange={setAcademicYearId}
      />
    </>
  );
};
ClassSummaryPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default ClassSummaryPage;
