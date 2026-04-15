"use client";

import {
  Badge,
  Card,
  Group,
  NumberFormatter,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBus,
  IconCash,
  IconCheck,
  IconClock,
  IconDiscount,
  IconFilter,
  IconGift,
  IconPackage,
  IconUsers,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { type BillBreakdown, useClassSummary } from "@/hooks/api/useReports";

interface ClassSummaryCardsProps {
  academicYearId?: string | null;
  onAcademicYearChange?: (value: string | null) => void;
}

export default function ClassSummaryCards({
  academicYearId: academicYearIdProp,
  onAcademicYearChange,
}: ClassSummaryCardsProps = {}) {
  const t = useTranslations();
  const [localYearId, setLocalYearId] = useState<string | null>(null);
  const academicYearId =
    academicYearIdProp !== undefined ? academicYearIdProp : localYearId;
  const setAcademicYearId = (value: string | null) => {
    if (onAcademicYearChange) onAcademicYearChange(value);
    else setLocalYearId(value);
  };

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });
  const activeYear = academicYearsData?.academicYears.find((ay) => ay.isActive);

  const { data, isLoading } = useClassSummary({
    academicYearId: academicYearId || activeYear?.id,
  });

  const academicYearOptions =
    academicYearsData?.academicYears.map((ay) => ({
      value: ay.id,
      label: `${ay.year}${ay.isActive ? ` (${t("common.active")})` : ""}`,
    })) || [];

  // Use effective fees (after scholarships) for percentage calculation
  const overallPercentage =
    data && data.totals.totalEffectiveFees > 0
      ? (data.totals.totalPaid / data.totals.totalEffectiveFees) * 100
      : 0;

  return (
    <Stack gap="md">
      {/* Overall Summary */}
      {data && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <Card withBorder>
            <Group>
              <ThemeIcon size="lg" color="blue" variant="light">
                <IconUsers size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  {t("report.classSummary.totalStudents")}
                </Text>
                <Text size="xl" fw={700}>
                  {data.totals.totalStudents}
                </Text>
              </div>
            </Group>
          </Card>
          <Card withBorder>
            <Group>
              <ThemeIcon size="lg" color="green" variant="light">
                <IconCheck size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  {t("report.classSummary.paidTuitions")}
                </Text>
                <Text size="xl" fw={700} c="green">
                  {data.totals.paid}
                </Text>
              </div>
            </Group>
          </Card>
          <Card withBorder>
            <Group>
              <ThemeIcon size="lg" color="yellow" variant="light">
                <IconClock size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  {t("report.classSummary.partialPayments")}
                </Text>
                <Text size="xl" fw={700} c="yellow">
                  {data.totals.partial}
                </Text>
              </div>
            </Group>
          </Card>
          <Card withBorder>
            <Group>
              <ThemeIcon size="lg" color="red" variant="light">
                <IconAlertTriangle size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  {t("report.classSummary.unpaidTuitions")}
                </Text>
                <Text size="xl" fw={700} c="red">
                  {data.totals.unpaid}
                </Text>
              </div>
            </Group>
          </Card>
        </SimpleGrid>
      )}

      {/* Overall Financial Summary */}
      {data && (
        <Card withBorder>
          <Stack gap="md">
            <Text fw={600}>{t("report.classSummary.paymentProgress")}</Text>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
              <div>
                <Text size="xs" c="dimmed">
                  {t("report.classSummary.totalFees")}
                </Text>
                <Text size="lg" fw={600}>
                  <NumberFormatter
                    value={data.totals.totalFees}
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                  />
                </Text>
              </div>
              {data.totals.totalScholarships > 0 && (
                <div>
                  <Group gap={4}>
                    <IconGift size={14} color="var(--mantine-color-teal-6)" />
                    <Text size="xs" c="dimmed">
                      {t("report.classSummary.scholarships")}
                    </Text>
                  </Group>
                  <Text size="lg" fw={600} c="teal">
                    -
                    <NumberFormatter
                      value={data.totals.totalScholarships}
                      prefix="Rp "
                      thousandSeparator="."
                      decimalSeparator=","
                    />
                  </Text>
                </div>
              )}

              {data.totals.totalDiscounts > 0 && (
                <div>
                  <Group gap={4}>
                    <IconDiscount
                      size={14}
                      color="var(--mantine-color-green-6)"
                    />
                    <Text size="xs" c="dimmed">
                      {t("report.classSummary.discounts")}
                    </Text>
                  </Group>
                  <Text size="lg" fw={600} c="green">
                    -
                    <NumberFormatter
                      value={data.totals.totalDiscounts}
                      prefix="Rp "
                      thousandSeparator="."
                      decimalSeparator=","
                    />
                  </Text>
                </div>
              )}
              <div>
                <Text size="xs" c="dimmed">
                  {data.totals.totalScholarships > 0
                    ? t("report.classSummary.netAmountDue")
                    : t("report.classSummary.totalCollected")}
                </Text>
                <Text
                  size="lg"
                  fw={600}
                  c={data.totals.totalScholarships > 0 ? "blue" : "green"}
                >
                  <NumberFormatter
                    value={
                      data.totals.totalScholarships > 0
                        ? data.totals.totalEffectiveFees
                        : data.totals.totalPaid
                    }
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                  />
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  {t("report.classSummary.totalCollected")}
                </Text>
                <Text size="lg" fw={600} c="green">
                  <NumberFormatter
                    value={data.totals.totalPaid}
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                  />
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  {t("report.classSummary.outstanding")}
                </Text>
                <Text size="lg" fw={600} c="red">
                  <NumberFormatter
                    value={data.totals.totalOutstanding}
                    prefix="Rp "
                    thousandSeparator="."
                    decimalSeparator=","
                  />
                </Text>
              </div>
            </SimpleGrid>
            <div>
              <Group justify="space-between" mb={4}>
                <Text size="sm" c="dimmed">
                  {t("report.classSummary.collectionRate")}
                  {data.totals.totalScholarships > 0 &&
                    ` (${t("report.classSummary.afterScholarships")})`}
                </Text>
                <Text size="sm" fw={600}>
                  {overallPercentage.toFixed(1)}%
                </Text>
              </Group>
              <Progress
                value={Math.min(overallPercentage, 100)}
                color={
                  overallPercentage >= 80
                    ? "green"
                    : overallPercentage >= 50
                      ? "yellow"
                      : "red"
                }
                size="lg"
              />
            </div>
          </Stack>
        </Card>
      )}

      {/* Filter */}
      <Paper withBorder p="md">
        <Group gap="md">
          <Select
            placeholder={t("report.classSummary.selectYear")}
            leftSection={<IconFilter size={16} />}
            data={academicYearOptions}
            value={academicYearId}
            onChange={setAcademicYearId}
            clearable
            w={200}
          />
        </Group>
      </Paper>

      {/* Class Cards */}
      {isLoading && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={200} />
          ))}
        </SimpleGrid>
      )}

      {!isLoading && data && (
        <SimpleGrid cols={{ base: 1, lg: 2 }}>
          {data.classes.map((cls) => {
            // Use effective fees (after scholarships) for percentage
            const effectiveFees =
              cls.statistics.totalEffectiveFees || cls.statistics.totalFees;
            const paidPercentage =
              effectiveFees > 0
                ? (cls.statistics.totalPaid / effectiveFees) * 100
                : 0;
            const hasScholarship = cls.statistics.totalScholarships > 0;
            const hasDiscount = cls.statistics.totalDiscounts > 0;

            return (
              <Card key={cls.class.id} withBorder>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Group gap="xs">
                      <Text fw={600}>{cls.class.className}</Text>
                      {hasScholarship && (
                        <ThemeIcon size="sm" color="teal" variant="light">
                          <IconGift size={12} />
                        </ThemeIcon>
                      )}
                    </Group>
                    <Badge
                      color={
                        paidPercentage >= 80
                          ? "green"
                          : paidPercentage >= 50
                            ? "yellow"
                            : "red"
                      }
                    >
                      {Math.min(paidPercentage, 100).toFixed(0)}%
                    </Badge>
                  </Group>

                  <SimpleGrid cols={2}>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t("report.classSummary.students")}
                      </Text>
                      <Text size="sm" fw={500}>
                        {cls.statistics.totalStudents}
                      </Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t("report.classSummary.tuitions")}
                      </Text>
                      <Text size="sm" fw={500}>
                        {cls.statistics.totalTuitions}
                      </Text>
                    </div>
                  </SimpleGrid>

                  <Group gap="xs" wrap="wrap">
                    <Badge color="green" variant="light" size="sm">
                      {t("report.classSummary.paid")}: {cls.statistics.paid}
                    </Badge>
                    <Badge color="yellow" variant="light" size="sm">
                      {t("report.classSummary.partial")}:{" "}
                      {cls.statistics.partial}
                    </Badge>
                    <Badge color="red" variant="light" size="sm">
                      {t("report.classSummary.unpaid")}: {cls.statistics.unpaid}
                    </Badge>
                    {hasScholarship && (
                      <Badge
                        color="teal"
                        variant="light"
                        size="sm"
                        leftSection={<IconGift size={10} />}
                      >
                        {t("report.classSummary.scholarships")}
                      </Badge>
                    )}
                    {hasDiscount && (
                      <Badge
                        color="green"
                        variant="light"
                        size="sm"
                        leftSection={<IconDiscount size={10} />}
                      >
                        {t("report.classSummary.discounts")}
                      </Badge>
                    )}
                  </Group>

                  <Progress
                    value={Math.min(paidPercentage, 100)}
                    color={
                      paidPercentage >= 80
                        ? "green"
                        : paidPercentage >= 50
                          ? "yellow"
                          : "red"
                    }
                    size="sm"
                  />

                  {hasScholarship && (
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        {t("report.classSummary.scholarshipDiscount")}:
                      </Text>
                      <Text size="xs" fw={500} c="teal">
                        -
                        <NumberFormatter
                          value={cls.statistics.totalScholarships}
                          prefix="Rp "
                          thousandSeparator="."
                          decimalSeparator=","
                        />
                      </Text>
                    </Group>
                  )}

                  {hasDiscount && (
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        {t("report.classSummary.discountAmount")}:
                      </Text>
                      <Text size="xs" fw={500} c="green">
                        -
                        <NumberFormatter
                          value={cls.statistics.totalDiscounts}
                          prefix="Rp "
                          thousandSeparator="."
                          decimalSeparator=","
                        />
                      </Text>
                    </Group>
                  )}

                  <SimpleGrid cols={2}>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t("report.classSummary.collected")}
                      </Text>
                      <Text size="sm" fw={500} c="green">
                        <NumberFormatter
                          value={cls.statistics.totalPaid}
                          prefix="Rp "
                          thousandSeparator="."
                          decimalSeparator=","
                        />
                      </Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">
                        {t("report.classSummary.outstanding")}
                      </Text>
                      <Text size="sm" fw={500} c="red">
                        <NumberFormatter
                          value={cls.statistics.totalOutstanding}
                          prefix="Rp "
                          thousandSeparator="."
                          decimalSeparator=","
                        />
                      </Text>
                    </div>
                  </SimpleGrid>

                  {cls.statistics.feeBill.totalBills > 0 && (
                    <BillSection
                      title={t("report.classSummary.feeBillSection")}
                      icon={<IconBus size={14} />}
                      stats={cls.statistics.feeBill}
                      t={t}
                    />
                  )}

                  {cls.statistics.serviceFeeBill.totalBills > 0 && (
                    <BillSection
                      title={t("report.classSummary.serviceFeeSection")}
                      icon={<IconPackage size={14} />}
                      stats={cls.statistics.serviceFeeBill}
                      t={t}
                    />
                  )}
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      {!isLoading && data && data.classes.length === 0 && (
        <Paper withBorder p="xl">
          <Stack align="center" gap="md">
            <ThemeIcon size={60} color="gray" variant="light">
              <IconCash size={30} />
            </ThemeIcon>
            <Text c="dimmed">{t("report.classSummary.noData")}</Text>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

function BillSection({
  title,
  icon,
  stats,
  t,
}: {
  title: string;
  icon: React.ReactNode;
  stats: BillBreakdown;
  t: (key: string) => string;
}) {
  return (
    <Paper withBorder p="xs" radius="sm">
      <Stack gap={6}>
        <Group gap={6} align="center">
          <ThemeIcon size="xs" variant="light" color="blue">
            {icon}
          </ThemeIcon>
          <Text size="xs" fw={600}>
            {title}
          </Text>
          <Text size="xs" c="dimmed">
            ({stats.totalBills})
          </Text>
        </Group>
        <Group gap="xs" wrap="wrap">
          <Badge color="green" variant="light" size="xs">
            {t("report.classSummary.paid")}: {stats.paid}
          </Badge>
          <Badge color="yellow" variant="light" size="xs">
            {t("report.classSummary.partial")}: {stats.partial}
          </Badge>
          <Badge color="red" variant="light" size="xs">
            {t("report.classSummary.unpaid")}: {stats.unpaid}
          </Badge>
        </Group>
        <SimpleGrid cols={2}>
          <div>
            <Text size="xs" c="dimmed">
              {t("report.classSummary.collected")}
            </Text>
            <Text size="xs" fw={500} c="green">
              <NumberFormatter
                value={stats.totalPaid}
                prefix="Rp "
                thousandSeparator="."
                decimalSeparator=","
              />
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">
              {t("report.classSummary.outstanding")}
            </Text>
            <Text size="xs" fw={500} c="red">
              <NumberFormatter
                value={stats.totalOutstanding}
                prefix="Rp "
                thousandSeparator="."
                decimalSeparator=","
              />
            </Text>
          </div>
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}
