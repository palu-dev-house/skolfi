import { Button, Group, Stack } from "@mantine/core";
import { IconFileSpreadsheet } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { z } from "zod";
import AdminLayout from "@/components/layouts/AdminLayout";
import { FeeServiceSummaryFilters } from "@/components/reports/FeeServiceSummaryFilters";
import { FeeServiceSummaryTable } from "@/components/reports/FeeServiceSummaryTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useExportFeeServiceSummary } from "@/hooks/api/useReports";
import { useQueryFilters } from "@/hooks/useQueryFilters";
import type { NextPageWithLayout } from "@/lib/page-types";

const schema = z.object({
  academicYearId: z.string().optional(),
  category: z.enum(["TRANSPORT", "ACCOMMODATION"]).optional(),
  feeServiceId: z.string().optional(),
  billStatus: z.enum(["UNPAID", "PARTIAL", "PAID", "VOID"]).optional(),
  classId: z.string().optional(),
  monthFrom: z.string().optional(),
  monthTo: z.string().optional(),
  search: z.string().optional(),
});

const FeeServiceSummaryPage: NextPageWithLayout =
  function FeeServiceSummaryPage() {
    const t = useTranslations();
    const { filters, page, limit, drafts, setFilter, setPage } =
      useQueryFilters({ schema });
    const { exportReport, isExporting } = useExportFeeServiceSummary();

    return (
      <>
        <PageHeader
          title={t("report.feeServiceSummary.title")}
          description={t("report.feeServiceSummary.description")}
          actions={
            <Group gap="sm">
              <Button
                variant="light"
                leftSection={<IconFileSpreadsheet size={18} />}
                loading={isExporting}
                onClick={() => exportReport(filters)}
              >
                {t("report.feeServiceSummary.exportExcel")}
              </Button>
            </Group>
          }
        />
        <Stack gap="md">
          <FeeServiceSummaryFilters
            filters={filters}
            searchDraft={drafts.search ?? ""}
            onChange={setFilter}
          />
          <FeeServiceSummaryTable
            filters={filters}
            page={page}
            limit={limit}
            onPageChange={setPage}
          />
        </Stack>
      </>
    );
  };

FeeServiceSummaryPage.getLayout = (page: ReactElement) => (
  <AdminLayout>{page}</AdminLayout>
);

export default FeeServiceSummaryPage;
