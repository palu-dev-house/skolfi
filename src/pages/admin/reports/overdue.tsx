import { Button, Group, Tabs } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { z } from "zod";
import AdminLayout from "@/components/layouts/AdminLayout";
import OverdueFeeBillReportTable from "@/components/tables/OverdueFeeBillReportTable";
import OverdueReportTable from "@/components/tables/OverdueReportTable";
import OverdueServiceFeeBillReportTable from "@/components/tables/OverdueServiceFeeBillReportTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useQueryFilters } from "@/hooks/useQueryFilters";
import type { NextPageWithLayout } from "@/lib/page-types";

const filterSchema = z.object({
  tab: z.enum(["tuition", "feeBill", "serviceFeeBill"]).optional(),
});

const OverdueReportPage: NextPageWithLayout = function OverdueReportPage() {
  const router = useRouter();
  const t = useTranslations();
  const { filters, setFilter } = useQueryFilters({ schema: filterSchema });
  const tab = filters.tab ?? "tuition";

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
      <Tabs
        value={tab}
        onChange={(v) =>
          setFilter(
            "tab",
            (v as "tuition" | "feeBill" | "serviceFeeBill" | null) || null,
          )
        }
        keepMounted={false}
      >
        <Tabs.List mb="md">
          <Tabs.Tab value="tuition">
            {t("report.overdue.tabs.tuition")}
          </Tabs.Tab>
          <Tabs.Tab value="feeBill">
            {t("report.overdue.tabs.feeBill")}
          </Tabs.Tab>
          <Tabs.Tab value="serviceFeeBill">
            {t("report.overdue.tabs.serviceFeeBill")}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="tuition">
          <OverdueReportTable />
        </Tabs.Panel>
        <Tabs.Panel value="feeBill">
          <OverdueFeeBillReportTable />
        </Tabs.Panel>
        <Tabs.Panel value="serviceFeeBill">
          <OverdueServiceFeeBillReportTable />
        </Tabs.Panel>
      </Tabs>
    </>
  );
};
OverdueReportPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default OverdueReportPage;
