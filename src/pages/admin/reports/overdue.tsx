import { Button, Group } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import OverdueReportTable from "@/components/tables/OverdueReportTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import type { NextPageWithLayout } from "@/lib/page-types";

const OverdueReportPage: NextPageWithLayout = function OverdueReportPage() {
  const router = useRouter();
  const t = useTranslations();

  return (
    <>
      <PageHeader
        title={t("report.overdue.title")}
        description={t("report.overdue.description")}
        actions={
          <Group gap="sm">
            <Button
              variant="light"
              leftSection={<IconChartBar size={18} />}
              onClick={() => router.push("/admin/reports/class-summary")}
            >
              {t("report.classSummary.title")}
            </Button>
          </Group>
        }
      />
      <OverdueReportTable />
    </>
  );
};
OverdueReportPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default OverdueReportPage;
