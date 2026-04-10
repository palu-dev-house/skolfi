"use client";

import {
  Badge,
  Card,
  Divider,
  Group,
  NumberFormatter,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useTranslations } from "next-intl";
import { Virtuoso } from "react-virtuoso";
import { EmptyAnimation } from "@/components/ui/LottieAnimation";
import { PaymentSkeleton } from "@/components/ui/PortalSkeleton";
import { useStudentTuitions } from "@/hooks/api/useStudentTuitions";

export default function TransactionHistoryPage() {
  const t = useTranslations();
  const { data: tuitions, isLoading } = useStudentTuitions();

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
    };
    const color = statusColorMap[status] || "gray";
    const label = t(`tuition.status.${status.toLowerCase()}` as const);
    return (
      <Badge color={color} size="sm">
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return <PaymentSkeleton />;
  }

  const list = tuitions || [];

  return (
    <Stack gap="md">
      <Title order={4}>{t("payment.history")}</Title>

      {list.length === 0 ? (
        <EmptyAnimation message={t("payment.noHistory")} />
      ) : (
        <Virtuoso
          useWindowScroll
          data={list}
          itemContent={(_index, tuition) => (
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
          )}
        />
      )}
    </Stack>
  );
}
