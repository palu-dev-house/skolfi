import { Button, Group } from "@mantine/core";
import {
  IconAlertTriangle,
  IconBus,
  IconFileSpreadsheet,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { z } from "zod";
import AdminLayout from "@/components/layouts/AdminLayout";
import ClassSummaryCards from "@/components/reports/ClassSummaryCards";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useExportClassSummary } from "@/hooks/api/useReports";
import { useQueryFilters } from "@/hooks/useQueryFilters";
import type { NextPageWithLayout } from "@/lib/page-types";

const filterSchema = z.object({
  academicYearId: z.string().optional(),
});

const ClassSummaryPage: NextPageWithLayout = function ClassSummaryPage() {
  const router = useRouter();
  const t = useTranslations();
  const { filters, setFilter } = useQueryFilters({ schema: filterSchema });
  const academicYearId = filters.academicYearId ?? null;
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
              leftSection={<IconBus size={18} />}
              onClick={() => router.push("/admin/reports/fee-services")}
            >
              {t("report.feeServiceSummary.title")}
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
        onAcademicYearChange={(v) => setFilter("academicYearId", v || null)}
      />
    </>
  );
};
ClassSummaryPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default ClassSummaryPage;
