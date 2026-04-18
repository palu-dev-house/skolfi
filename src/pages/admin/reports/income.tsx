import {
  Alert,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import {
  DateInput,
  type DateStringValue,
  MonthPickerInput,
  YearPickerInput,
} from "@mantine/dates";
import {
  IconCalendar,
  IconDownload,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { downloadFileFromApi } from "@/lib/download";
import type { NextPageWithLayout } from "@/lib/page-types";

type ReportPeriod = "daily" | "monthly" | "yearly";

const IncomeReportPage: NextPageWithLayout = function IncomeReportPage() {
  const t = useTranslations();
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [dateFrom, setDateFrom] = useState<DateStringValue | null>(null);
  const [dateTo, setDateTo] = useState<DateStringValue | null>(null);

  const handlePeriodChange = (val: string) => {
    setPeriod(val as ReportPeriod);
    setDateFrom(null);
    setDateTo(null);
  };

  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      params.set("period", period);

      let resolvedFrom: string | null = null;
      let resolvedTo: string | null = null;

      if (dateFrom) {
        if (period === "monthly") {
          resolvedFrom = dayjs(dateFrom).startOf("month").format("YYYY-MM-DD");
        } else if (period === "yearly") {
          resolvedFrom = dayjs(dateFrom).startOf("year").format("YYYY-MM-DD");
        } else {
          resolvedFrom = dateFrom;
        }
      }

      if (dateTo) {
        if (period === "monthly") {
          resolvedTo = dayjs(dateTo).endOf("month").format("YYYY-MM-DD");
        } else if (period === "yearly") {
          resolvedTo = dayjs(dateTo).endOf("year").format("YYYY-MM-DD");
        } else {
          resolvedTo = dateTo;
        }
      }

      if (resolvedFrom) params.set("dateFrom", resolvedFrom);
      if (resolvedTo) params.set("dateTo", resolvedTo);

      await downloadFileFromApi(
        `/api/v1/reports/income/export?${params.toString()}`,
        `laporan-pendapatan-${period}-${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    },
  });

  const isPending = exportMutation.isPending;

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
            onChange={handlePeriodChange}
            disabled={isPending}
            data={[
              { label: t("report.income.daily"), value: "daily" },
              { label: t("report.income.monthly"), value: "monthly" },
              { label: t("report.income.yearly"), value: "yearly" },
            ]}
          />

          <Group grow>
            {period === "daily" && (
              <>
                <DateInput
                  label={t("report.income.dateFrom")}
                  placeholder="dd/mm/yyyy"
                  value={dateFrom}
                  onChange={setDateFrom}
                  valueFormat="DD/MM/YYYY"
                  leftSection={<IconCalendar size={18} />}
                  clearable
                  disabled={isPending}
                />
                <DateInput
                  label={t("report.income.dateTo")}
                  placeholder="dd/mm/yyyy"
                  value={dateTo}
                  onChange={setDateTo}
                  valueFormat="DD/MM/YYYY"
                  leftSection={<IconCalendar size={18} />}
                  clearable
                  disabled={isPending}
                />
              </>
            )}
            {period === "monthly" && (
              <>
                <MonthPickerInput
                  label={t("report.income.monthFrom")}
                  placeholder="mm/yyyy"
                  value={dateFrom}
                  onChange={setDateFrom}
                  valueFormat="MM/YYYY"
                  leftSection={<IconCalendar size={18} />}
                  clearable
                  disabled={isPending}
                />
                <MonthPickerInput
                  label={t("report.income.monthTo")}
                  placeholder="mm/yyyy"
                  value={dateTo}
                  onChange={setDateTo}
                  valueFormat="MM/YYYY"
                  leftSection={<IconCalendar size={18} />}
                  clearable
                  disabled={isPending}
                />
              </>
            )}
            {period === "yearly" && (
              <>
                <YearPickerInput
                  label={t("report.income.yearFrom")}
                  placeholder="yyyy"
                  value={dateFrom}
                  onChange={setDateFrom}
                  valueFormat="YYYY"
                  leftSection={<IconCalendar size={18} />}
                  clearable
                  disabled={isPending}
                />
                <YearPickerInput
                  label={t("report.income.yearTo")}
                  placeholder="yyyy"
                  value={dateTo}
                  onChange={setDateTo}
                  valueFormat="YYYY"
                  leftSection={<IconCalendar size={18} />}
                  clearable
                  disabled={isPending}
                />
              </>
            )}
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
            onClick={() => exportMutation.mutate()}
            loading={isPending}
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
