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
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconDownload,
  IconFilter,
  IconPhone,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { z } from "zod";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { useClassAcademics } from "@/hooks/api/useClassAcademics";
import {
  useExportOverdueReport,
  useOverdueReport,
} from "@/hooks/api/useReports";
import { useQueryFilters } from "@/hooks/useQueryFilters";
import { getMonthDisplayName } from "@/lib/business-logic/tuition-generator";

const filterSchema = z.object({
  classAcademicId: z.string().optional(),
  grade: z.string().optional(),
  academicYearId: z.string().optional(),
  schoolLevel: z.enum(["SD", "SMP", "SMA"]).optional(),
  studentSearch: z.string().optional(),
});

const SCHOOL_LEVELS = ["SD", "SMP", "SMA"] as const;

export default function OverdueReportTable() {
  const t = useTranslations("report");
  const tClass = useTranslations("class");
  const tAcademicYear = useTranslations("academicYear");
  const { filters, drafts, setFilter, setFilters } = useQueryFilters({
    schema: filterSchema,
    debounceKeys: ["studentSearch"],
  });
  const [openedItem, setOpenedItem] = useState<string | null>(null);
  const classAcademicId = filters.classAcademicId ?? null;
  const grade = filters.grade ?? null;
  const academicYearId = filters.academicYearId ?? null;
  const schoolLevel = filters.schoolLevel ?? null;
  const studentSearch = filters.studentSearch ?? "";

  const grades = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `${tClass("grade")} ${i + 1}`,
  }));

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });

  const { data: classesData } = useClassAcademics({
    limit: 100,
    academicYearId: academicYearId || undefined,
    grade: grade ? Number(grade) : undefined,
  });

  const { data, isLoading, refetch, isFetching } = useOverdueReport({
    classAcademicId: classAcademicId || undefined,
    grade: grade ? Number(grade) : undefined,
    academicYearId: academicYearId || undefined,
    schoolLevel: schoolLevel ?? undefined,
    search: studentSearch || undefined,
  });

  const { exportReport } = useExportOverdueReport();

  const handleExport = () => {
    exportReport({
      classAcademicId: classAcademicId || undefined,
      grade: grade ? Number(grade) : undefined,
      academicYearId: academicYearId || undefined,
      schoolLevel: schoolLevel ?? undefined,
      search: studentSearch || undefined,
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
          <TextInput
            placeholder={t("searchStudent")}
            leftSection={<IconSearch size={16} />}
            value={drafts.studentSearch ?? ""}
            onChange={(e) =>
              setFilter("studentSearch", e.currentTarget.value || null)
            }
          />
          <Select
            placeholder={t("filterBySchoolLevel")}
            data={SCHOOL_LEVELS.map((s) => ({ value: s, label: s }))}
            value={schoolLevel}
            onChange={(v) =>
              setFilter("schoolLevel", (v as "SD" | "SMP" | "SMA") || null)
            }
            clearable
          />
          <Select
            placeholder={t("filterByAcademicYear")}
            leftSection={<IconFilter size={16} />}
            data={yearOptions}
            value={academicYearId}
            onChange={(value) => {
              setFilters({
                academicYearId: value ?? undefined,
                classAcademicId: undefined,
              });
            }}
            clearable
          />
          <Select
            placeholder={t("filterByGrade")}
            data={grades}
            value={grade}
            onChange={(value) => {
              setFilters({
                grade: value ?? undefined,
                classAcademicId: undefined,
              });
            }}
            clearable
          />
          <Select
            placeholder={t("filterByClass")}
            data={classOptions}
            value={classAcademicId}
            onChange={(value) => setFilter("classAcademicId", value || null)}
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
          <ActionIcon
            variant="default"
            size="lg"
            onClick={() => refetch()}
            loading={isFetching}
          >
            <IconRefresh size={18} />
          </ActionIcon>
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
                            NIS {item.student.nis} · {item.student.schoolLevel}
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
                            <Text fw={500}>
                              {item.student.parentName || "-"}
                            </Text>
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
                                    {getMonthDisplayName(month.period)}{" "}
                                    {month.year}
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
