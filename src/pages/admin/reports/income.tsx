import {
  Alert,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { DateInput, type DateStringValue } from "@mantine/dates";
import {
  IconCalendar,
  IconDownload,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import type { NextPageWithLayout } from "@/lib/page-types";

type ReportPeriod = "daily" | "monthly" | "yearly";

const IncomeReportPage: NextPageWithLayout = function IncomeReportPage() {
  const t = useTranslations();
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [dateFrom, setDateFrom] = useState<DateStringValue | null>(null);
  const [dateTo, setDateTo] = useState<DateStringValue | null>(null);

  const handleExport = () => {
    const params = new URLSearchParams();
    params.set("period", period);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.open(`/api/v1/reports/income/export?${params.toString()}`, "_blank");
  };

  return (
    <>
      <PageHeader
        title={t("report.income.title")}
        description={t("report.income.description")}
      />
      <Paper withBorder p="lg">
        <Stack gap="md">
          <Text fw={500}>{t("report.income.periodType")}</Text>
          <SegmentedControl
            value={period}
            onChange={(val) => setPeriod(val as ReportPeriod)}
            data={[
              { label: t("report.income.daily"), value: "daily" },
              { label: t("report.income.monthly"), value: "monthly" },
              { label: t("report.income.yearly"), value: "yearly" },
            ]}
          />

          <Group grow>
            <DateInput
              label={t("report.income.dateFrom")}
              placeholder="dd/mm/yyyy"
              value={dateFrom}
              onChange={setDateFrom}
              valueFormat="DD/MM/YYYY"
              leftSection={<IconCalendar size={18} />}
              clearable
            />
            <DateInput
              label={t("report.income.dateTo")}
              placeholder="dd/mm/yyyy"
              value={dateTo}
              onChange={setDateTo}
              valueFormat="DD/MM/YYYY"
              leftSection={<IconCalendar size={18} />}
              clearable
            />
          </Group>

          <Alert
            icon={<IconInfoCircle size={18} />}
            color="blue"
            variant="light"
          >
            <Text size="sm">{t("report.income.exportInfo")}</Text>
          </Alert>

          <Button
            leftSection={<IconDownload size={18} />}
            onClick={handleExport}
          >
            {t("report.income.exportExcel")}
          </Button>
        </Stack>
      </Paper>
    </>
  );
};

IncomeReportPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default IncomeReportPage;
