import { Grid, Paper, Select, TextInput } from "@mantine/core";
import { MonthPickerInput } from "@mantine/dates";
import { IconSearch } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { useClassAcademics } from "@/hooks/api/useClassAcademics";
import { useFeeServices } from "@/hooks/api/useFeeServices";
import type { FeeServiceSummaryFilters as Filters } from "@/lib/business-logic/fee-service-summary";

interface Props {
  filters: Filters;
  searchDraft: string;
  onChange: <K extends keyof Filters>(key: K, value: Filters[K] | null) => void;
}

function ymFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function FeeServiceSummaryFilters({
  filters,
  searchDraft,
  onChange,
}: Props) {
  const t = useTranslations();
  const { data: yearsData } = useAcademicYears({ limit: 100 });
  const { data: classesData } = useClassAcademics({
    limit: 200,
    academicYearId: filters.academicYearId,
  });
  const { data: servicesData } = useFeeServices({
    limit: 200,
    category: filters.category,
    academicYearId: filters.academicYearId,
  });

  const years = yearsData?.academicYears ?? [];
  const classes = classesData?.classes ?? [];
  const services = servicesData?.feeServices ?? [];

  return (
    <Paper p="md" radius="md" withBorder>
      <Grid gutter="sm">
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Select
            label={t("report.feeServiceSummary.category")}
            data={[
              {
                value: "TRANSPORT",
                label: t("report.feeServiceSummary.categoryTransport"),
              },
              {
                value: "ACCOMMODATION",
                label: t("report.feeServiceSummary.categoryAccommodation"),
              },
            ]}
            placeholder={t("report.feeServiceSummary.categoryAll")}
            value={filters.category ?? null}
            onChange={(v) =>
              onChange("category", (v as Filters["category"]) || null)
            }
            clearable
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Select
            label={t("academicYear.title")}
            data={years.map((y) => ({ value: y.id, label: y.year }))}
            value={filters.academicYearId ?? null}
            onChange={(v) => onChange("academicYearId", v || null)}
            clearable
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Select
            label={t("report.feeServiceSummary.feeService")}
            data={services.map((s) => ({ value: s.id, label: s.name }))}
            value={filters.feeServiceId ?? null}
            onChange={(v) => onChange("feeServiceId", v || null)}
            clearable
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Select
            label={t("report.feeServiceSummary.billStatus")}
            data={[
              { value: "UNPAID", label: "UNPAID" },
              { value: "PARTIAL", label: "PARTIAL" },
              { value: "PAID", label: "PAID" },
              { value: "VOID", label: "VOID" },
            ]}
            value={filters.billStatus ?? null}
            onChange={(v) =>
              onChange("billStatus", (v as Filters["billStatus"]) || null)
            }
            clearable
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Select
            label={t("class.title")}
            data={classes.map((c) => ({ value: c.id, label: c.className }))}
            value={filters.classId ?? null}
            onChange={(v) => onChange("classId", v || null)}
            clearable
            searchable
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <MonthPickerInput
            label={t("report.feeServiceSummary.monthFrom")}
            value={
              filters.monthFrom ? new Date(`${filters.monthFrom}-01`) : null
            }
            onChange={(d) =>
              onChange("monthFrom", d ? ymFromDate(new Date(d)) : null)
            }
            clearable
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <MonthPickerInput
            label={t("report.feeServiceSummary.monthTo")}
            value={filters.monthTo ? new Date(`${filters.monthTo}-01`) : null}
            onChange={(d) =>
              onChange("monthTo", d ? ymFromDate(new Date(d)) : null)
            }
            clearable
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <TextInput
            label={t("common.search")}
            leftSection={<IconSearch size={16} />}
            placeholder={t("report.feeServiceSummary.searchPlaceholder")}
            value={searchDraft}
            onChange={(e) => onChange("search", e.currentTarget.value || null)}
          />
        </Grid.Col>
      </Grid>
    </Paper>
  );
}
