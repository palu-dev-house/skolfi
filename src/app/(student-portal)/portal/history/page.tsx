"use client";

import {
  Badge,
  Card,
  Divider,
  Group,
  NumberFormatter,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconCash,
  IconCoin,
  IconReceipt,
  IconReceiptOff,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { EmptyAnimation } from "@/components/ui/LottieAnimation";
import { PaymentSkeleton } from "@/components/ui/PortalSkeleton";
import type { StudentTuition } from "@/hooks/api/useStudentTuitions";
import { useStudentTuitions } from "@/hooks/api/useStudentTuitions";

export default function TransactionHistoryPage() {
  const t = useTranslations();
  const { data: tuitions, isLoading } = useStudentTuitions();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState<string | null>(null);

  const formatPeriod = (period: string): string => {
    const monthKey = `months.${period}` as const;
    const monthTranslation = t.raw(monthKey);
    if (monthTranslation !== monthKey) {
      return monthTranslation as string;
    }
    const periodKey = `periods.${period}` as const;
    const periodTranslation = t.raw(periodKey);
    if (periodTranslation !== periodKey) {
      return periodTranslation as string;
    }
    return period;
  };

  const getStatusBadge = (status: string) => {
    const statusColorMap: Record<string, string> = {
      UNPAID: "red",
      PARTIAL: "yellow",
      PAID: "green",
      VOID: "gray",
    };
    const color = statusColorMap[status] || "gray";
    const label = t(`tuition.status.${status.toLowerCase()}` as const);
    return (
      <Badge color={color} size="sm">
        {label}
      </Badge>
    );
  };

  // Extract unique academic years for filter
  const academicYears = useMemo(() => {
    if (!tuitions) return [];
    const years = [...new Set(tuitions.map((t) => t.academicYear))];
    return years.sort().reverse();
  }, [tuitions]);

  // Filter tuitions
  const filteredTuitions = useMemo(() => {
    if (!tuitions) return [];
    return tuitions.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (yearFilter && t.academicYear !== yearFilter) return false;
      return true;
    });
  }, [tuitions, statusFilter, yearFilter]);

  // Aggregation
  const aggregation = useMemo(() => {
    const list = filteredTuitions;
    const totalFee = list.reduce((sum, t) => sum + Number(t.feeAmount), 0);
    const totalPaid = list.reduce((sum, t) => sum + Number(t.paidAmount), 0);
    const totalRemaining = totalFee - totalPaid;
    const paidCount = list.filter((t) => t.status === "PAID").length;
    return { totalFee, totalPaid, totalRemaining, total: list.length, paidCount };
  }, [filteredTuitions]);

  if (isLoading) {
    return <PaymentSkeleton />;
  }

  return (
    <Stack gap="md">
      <Title order={4}>{t("payment.history")}</Title>

      {/* Aggregation Summary */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
        <SummaryCard
          icon={<IconReceipt size={20} />}
          label={t("common.total")}
          value={`${aggregation.paidCount}/${aggregation.total}`}
          color="blue"
        />
        <SummaryCard
          icon={<IconCoin size={20} />}
          label={t("history.totalFee")}
          amount={aggregation.totalFee}
          color="gray"
        />
        <SummaryCard
          icon={<IconCash size={20} />}
          label={t("history.totalPaid")}
          amount={aggregation.totalPaid}
          color="green"
        />
        <SummaryCard
          icon={<IconReceiptOff size={20} />}
          label={t("history.remaining")}
          amount={aggregation.totalRemaining}
          color="red"
        />
      </SimpleGrid>

      {/* Filters */}
      <Paper withBorder p="sm">
        <Stack gap="sm">
          <SegmentedControl
            value={statusFilter}
            onChange={setStatusFilter}
            size="xs"
            data={[
              { label: t("common.all"), value: "ALL" },
              { label: t("tuition.status.unpaid"), value: "UNPAID" },
              { label: t("tuition.status.partial"), value: "PARTIAL" },
              { label: t("tuition.status.paid"), value: "PAID" },
              { label: t("tuition.status.void"), value: "VOID" },
            ]}
            fullWidth
          />
          {academicYears.length > 1 && (
            <Select
              placeholder={t("history.allYears")}
              value={yearFilter}
              onChange={setYearFilter}
              clearable
              size="sm"
              data={academicYears.map((y) => ({ label: y, value: y }))}
            />
          )}
        </Stack>
      </Paper>

      {filteredTuitions.length === 0 ? (
        <EmptyAnimation message={t("payment.noHistory")} />
      ) : (
        <Virtuoso
          useWindowScroll
          data={filteredTuitions}
          itemContent={(_index, tuition) => (
            <TuitionHistoryCard
              tuition={tuition}
              formatPeriod={formatPeriod}
              getStatusBadge={getStatusBadge}
              t={t}
            />
          )}
        />
      )}
    </Stack>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  amount,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  amount?: number;
  color: string;
}) {
  return (
    <Paper withBorder p="sm">
      <Stack gap={4}>
        <Group gap={6}>
          <Text c={color}>{icon}</Text>
          <Text size="xs" c="dimmed" fw={500}>
            {label}
          </Text>
        </Group>
        {value ? (
          <Text size="lg" fw={700}>
            {value}
          </Text>
        ) : (
          <Text size="sm" fw={700}>
            <NumberFormatter
              value={amount ?? 0}
              prefix="Rp "
              thousandSeparator="."
              decimalSeparator=","
            />
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

function TuitionHistoryCard({
  tuition,
  formatPeriod,
  getStatusBadge,
  t,
}: {
  tuition: StudentTuition;
  formatPeriod: (period: string) => string;
  getStatusBadge: (status: string) => React.ReactNode;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Card withBorder py="sm" mb="sm">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={500} truncate>
              {formatPeriod(tuition.period)} {tuition.year}
            </Text>
            <Text size="xs" c="dimmed">
              {tuition.className} — {tuition.academicYear}
            </Text>
          </Stack>
          {getStatusBadge(tuition.status)}
        </Group>
        <Divider />
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              {t("payment.nominal")}
            </Text>
            <Text size="sm" fw={600}>
              <NumberFormatter
                value={Number(tuition.feeAmount)}
                prefix="Rp "
                thousandSeparator="."
                decimalSeparator=","
              />
            </Text>
          </Stack>
          <Stack gap={0} align="flex-end">
            <Text size="xs" c="dimmed">
              {t("tuition.paidAmount")}
            </Text>
            <Text size="sm" fw={600} c="green">
              <NumberFormatter
                value={Number(tuition.paidAmount)}
                prefix="Rp "
                thousandSeparator="."
                decimalSeparator=","
              />
            </Text>
          </Stack>
        </Group>
      </Stack>
    </Card>
  );
}
