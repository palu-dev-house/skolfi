"use client";

import {
  Accordion,
  ActionIcon,
  Badge,
  Button,
  Group,
  NumberFormatter,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconDownload,
  IconFilter,
  IconPhone,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { useClassAcademics } from "@/hooks/api/useClassAcademics";
import {
  useExportOverdueReport,
  useOverdueReport,
} from "@/hooks/api/useReports";
import { useQueryParams } from "@/hooks/useQueryParams";
import { getMonthDisplayName } from "@/lib/business-logic/tuition-generator";

export default function OverdueReportTable() {
  const t = useTranslations("report");
  const tClass = useTranslations("class");
  const tAcademicYear = useTranslations("academicYear");
  const { setParams, getParam } = useQueryParams();
  const [openedItem, setOpenedItem] = useState<string | null>(null);
  const classAcademicId = getParam("classAcademicId") ?? null;
  const grade = getParam("grade") ?? null;
  const academicYearId = getParam("academicYearId") ?? null;

  const grades = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `${tClass("grade")} ${i + 1}`,
  }));

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });
  const activeYear = academicYearsData?.academicYears.find((ay) => ay.isActive);

  const { data: classesData } = useClassAcademics({
    limit: 100,
    academicYearId: academicYearId || activeYear?.id,
    grade: grade ? Number(grade) : undefined,
  });

  const { data, isLoading } = useOverdueReport({
    classAcademicId: classAcademicId || undefined,
    grade: grade ? Number(grade) : undefined,
    academicYearId: academicYearId || activeYear?.id,
  });

  const { exportReport } = useExportOverdueReport();

  const handleExport = () => {
    exportReport({
      classAcademicId: classAcademicId || undefined,
      grade: grade ? Number(grade) : undefined,
      academicYearId: academicYearId || activeYear?.id,
    });
  };

  const yearOptions =
    academicYearsData?.academicYears?.map((ay) => ({
      value: ay.id,
      label:
        ay.year + (ay.isActive ? ` (${tAcademicYear("statuses.active")})` : ""),
    })) || [];

  const classOptions =
    classesData?.classes?.map((c) => ({
      value: c.id,
      label: c.className,
    })) || [];

  const overdue = data?.overdue || [];

  return (
    <Stack gap="md">
      {/* Summary Cards */}
      {data && (
        <Group gap="md" grow>
          <Paper withBorder p="md" radius="md">
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                {t("studentsWithOverdue")}
              </Text>
              <Text size="xl" fw={700} c="red">
                {data.summary.totalStudents}
              </Text>
            </Stack>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                {t("totalOverdueRecords")}
              </Text>
              <Text size="xl" fw={700} c="orange">
                {data.summary.totalOverdueRecords}
              </Text>
            </Stack>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                {t("totalOutstandingAmount")}
              </Text>
              <Text size="xl" fw={700} c="red">
                <NumberFormatter
                  value={data.summary.totalOverdueAmount}
                  prefix="Rp "
                  thousandSeparator="."
                  decimalSeparator=","
                />
              </Text>
            </Stack>
          </Paper>
        </Group>
      )}

      {/* Filters */}
      <Paper withBorder p="md">
        <Group gap="md" grow>
          <Select
            placeholder={t("filterByAcademicYear")}
            leftSection={<IconFilter size={16} />}
            data={yearOptions}
            value={academicYearId}
            onChange={(value) => {
              setParams({ academicYearId: value, classAcademicId: null });
            }}
            clearable
          />
          <Select
            placeholder={t("filterByGrade")}
            data={grades}
            value={grade}
            onChange={(value) => {
              setParams({ grade: value, classAcademicId: null });
            }}
            clearable
          />
          <Select
            placeholder={t("filterByClass")}
            data={classOptions}
            value={classAcademicId}
            onChange={(value) => setParams({ classAcademicId: value })}
            clearable
            searchable
          />
          <Button
            leftSection={<IconDownload size={18} />}
            variant="light"
            onClick={handleExport}
            disabled={!data || data.overdue.length === 0}
          >
            {t("exportToExcel")}
          </Button>
        </Group>
      </Paper>

      {/* Loading State */}
      {isLoading && (
        <Paper withBorder p="md">
          <Stack gap="md">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={`skeleton-${i}`} height={80} />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Empty State */}
      {!isLoading && data?.overdue.length === 0 && (
        <Paper withBorder p="xl">
          <Text ta="center" c="dimmed" py="xl">
            {t("noOverdueFound")}
          </Text>
        </Paper>
      )}

      {/* Overdue Report Accordion */}
      {!isLoading && overdue.length > 0 && (
        <Virtuoso
          useWindowScroll
          data={overdue}
          itemContent={(index, item) => {
            const itemValue = `${item.student.nis}-${item.class.className}-${index}`;
            return (
              <Accordion
                key={itemValue}
                variant="separated"
                chevron={<IconChevronDown size={20} />}
                value={openedItem === itemValue ? itemValue : null}
                onChange={(val) => setOpenedItem(val)}
                mb="xs"
              >
                <Accordion.Item value={itemValue}>
                  <Accordion.Control>
                    <Group justify="space-between" wrap="nowrap" pr="md">
                      <Stack gap={0}>
                        <Group gap="xs">
                          <Text fw={600}>{item.student.name}</Text>
                          <Badge size="sm" variant="light">
                            {item.student.nis}
                          </Badge>
                        </Group>
                        <Text size="sm" c="dimmed">
                          {item.class.className}
                        </Text>
                      </Stack>
                      <Group gap="md">
                        <Stack gap={0} align="flex-end">
                          <Text size="sm" c="dimmed">
                            {t("overdueAmount")}
                          </Text>
                          <Text fw={700} c="red">
                            <NumberFormatter
                              value={item.totalOverdue}
                              prefix="Rp "
                              thousandSeparator="."
                              decimalSeparator=","
                            />
                          </Text>
                        </Stack>
                        <Badge color="red" size="lg">
                          {item.overdueCount} {t("month")}
                        </Badge>
                      </Group>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="md">
                      {/* Parent Info */}
                      <Paper withBorder p="sm" bg="gray.0">
                        <Group gap="md">
                          <Stack gap={0}>
                            <Text size="sm" c="dimmed">
                              {t("parentName")}
                            </Text>
                            <Text fw={500}>{item.student.parentName || "-"}</Text>
                          </Stack>
                          <Stack gap={0}>
                            <Text size="sm" c="dimmed">
                              {t("overdue.student")}
                            </Text>
                            <Group gap="xs">
                              <Text fw={500}>{item.student.parentPhone}</Text>
                              <Tooltip label={t("callParent")}>
                                <ActionIcon
                                  variant="subtle"
                                  color="green"
                                  size="sm"
                                  component="a"
                                  href={`tel:${item.student.parentPhone}`}
                                >
                                  <IconPhone size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Stack>
                        </Group>
                      </Paper>

                      {/* Overdue Months Table */}
                      <Table.ScrollContainer minWidth={700}>
                        <Table striped highlightOnHover withTableBorder>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>{t("month")}</Table.Th>
                              <Table.Th>{t("dueDate")}</Table.Th>
                              <Table.Th ta="right" align="right">
                                {t("feeAmount")}
                              </Table.Th>
                              <Table.Th ta="right" align="right">
                                {t("scholarshipAmount")}
                              </Table.Th>
                              <Table.Th ta="right" align="right">
                                {t("discountAmount")}
                              </Table.Th>
                              <Table.Th ta="right" align="right">
                                {t("paidAmount")}
                              </Table.Th>
                              <Table.Th ta="right" align="right">
                                {t("outstanding")}
                              </Table.Th>
                              <Table.Th>{t("daysOverdue")}</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {item.overduePeriods?.map((month) => (
                              <Table.Tr key={month.tuitionId}>
                                <Table.Td>
                                  <Text size="sm">
                                    {getMonthDisplayName(month.period)} {month.year}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm">
                                    {dayjs(month.dueDate).format("DD/MM/YYYY")}
                                  </Text>
                                </Table.Td>
                                <Table.Td ta="right" align="right">
                                  <NumberFormatter
                                    value={month.feeAmount}
                                    prefix="Rp "
                                    thousandSeparator="."
                                    decimalSeparator=","
                                  />
                                </Table.Td>
                                <Table.Td ta="right" align="right" c="blue">
                                  <NumberFormatter
                                    value={month.scholarshipAmount || "-"}
                                    prefix="Rp "
                                    thousandSeparator="."
                                    decimalSeparator=","
                                  />
                                </Table.Td>
                                <Table.Td ta="right" align="right" c="blue">
                                  <NumberFormatter
                                    value={month.discountAmount * -1 || "-"}
                                    prefix="Rp "
                                    thousandSeparator="."
                                    decimalSeparator=","
                                  />
                                </Table.Td>
                                <Table.Td ta="right" align="right">
                                  <NumberFormatter
                                    value={month.paidAmount || "-"}
                                    prefix="Rp "
                                    thousandSeparator="."
                                    decimalSeparator=","
                                  />
                                </Table.Td>
                                <Table.Td ta="right" align="right">
                                  <Text fw={600} c="red">
                                    <NumberFormatter
                                      value={month.outstandingAmount}
                                      prefix="Rp "
                                      thousandSeparator="."
                                      decimalSeparator=","
                                    />
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Badge
                                    color={
                                      month.daysOverdue > 30
                                        ? "red"
                                        : month.daysOverdue > 14
                                          ? "orange"
                                          : "yellow"
                                    }
                                    variant="light"
                                  >
                                    {month.daysOverdue} {t("days")}
                                  </Badge>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </Table.ScrollContainer>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            );
          }}
        />
      )}
    </Stack>
  );
}
