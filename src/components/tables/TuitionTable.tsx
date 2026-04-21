"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
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
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconFilter,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import ColumnSettingsDrawer, {
  useColumnSettings,
} from "@/components/ui/ColumnSettingsDrawer";
import TablePagination from "@/components/ui/TablePagination";
import type { PaymentStatus } from "@/generated/prisma/client";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { useClassAcademics } from "@/hooks/api/useClassAcademics";
import {
  useDeleteTuition,
  useMassUpdateTuitions,
  useTuitions,
} from "@/hooks/api/useTuitions";
import { useQueryFilters } from "@/hooks/useQueryFilters";
import {
  getPeriodDisplayName,
  PERIODS,
} from "@/lib/business-logic/tuition-generator";

const filtersSchema = z.object({
  academicYearId: z.string().optional(),
  classAcademicId: z.string().optional(),
  schoolLevel: z.enum(["TK", "SD", "SMP", "SMA"]).optional(),
  status: z.enum(["UNPAID", "PARTIAL", "PAID", "VOID"]).optional(),
  period: z.string().optional(),
  studentSearch: z.string().optional(),
});

const SCHOOL_LEVELS = ["TK", "SD", "SMP", "SMA"] as const;

const STATUS_COLORS: Record<PaymentStatus, string> = {
  UNPAID: "red",
  PARTIAL: "yellow",
  PAID: "green",
  VOID: "gray",
};

export default function TuitionTable() {
  const t = useTranslations();
  const { filters, page, drafts, setFilter, setPage } = useQueryFilters({
    schema: filtersSchema,
    debounceKeys: ["studentSearch"],
  });
  const academicYearId = filters.academicYearId ?? null;
  const classAcademicId = filters.classAcademicId ?? null;
  const status = filters.status ?? null;
  const period = filters.period ?? null;
  const studentSearch = filters.studentSearch ?? "";
  const schoolLevel = filters.schoolLevel ?? null;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });

  const selectedYearId = academicYearId || undefined;

  const { data: classesData } = useClassAcademics({
    limit: 100,
    academicYearId: selectedYearId,
  });

  const { data, isLoading, refetch, isFetching } = useTuitions({
    page,
    limit: 10,
    classAcademicId: classAcademicId || undefined,
    schoolLevel: schoolLevel ?? undefined,
    status: status as PaymentStatus | undefined,
    period: period || undefined,
    studentId: studentSearch || undefined,
  });

  const deleteTuition = useDeleteTuition();
  const massUpdate = useMassUpdateTuitions();

  const columnDefs = [
    { key: "student", label: t("tuition.student") },
    { key: "class", label: t("tuition.class") },
    { key: "period", label: t("tuition.period") },
    { key: "feeAmount", label: t("tuition.feeAmount") },
    { key: "discountAmount", label: t("tuition.discountAmount") },
    { key: "paidAmount", label: t("tuition.paidAmount") },
    { key: "dueDate", label: t("tuition.dueDate") },
    { key: "status", label: t("common.status") },
    { key: "actions", label: t("common.actions") },
  ];

  const { orderedKeys } = useColumnSettings("tuitions", columnDefs);

  const tuitionIds = data?.tuitions.map((t) => t.id) || [];
  const allSelected =
    tuitionIds.length > 0 && tuitionIds.every((id) => selectedIds.has(id));
  const someSelected = tuitionIds.some((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tuitionIds));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMassUpdate = (newStatus: PaymentStatus) => {
    const ids = Array.from(selectedIds);
    const statusLabel = t(`tuition.status.${newStatus.toLowerCase()}`);

    modals.openConfirmModal({
      title: t("tuition.massUpdate.title"),
      children: (
        <Text size="sm">
          {t("tuition.massUpdate.confirm", {
            count: ids.length,
            status: statusLabel,
          })}
        </Text>
      ),
      labels: { confirm: t("common.confirm"), cancel: t("common.cancel") },
      confirmProps: { color: newStatus === "VOID" ? "gray" : "blue" },
      onConfirm: () => {
        massUpdate.mutate(
          { tuitionIds: ids, status: newStatus },
          {
            onSuccess: (result) => {
              notifications.show({
                title: t("common.success"),
                message: t("tuition.massUpdate.success", {
                  count: result.updated,
                }),
                color: "green",
              });
              setSelectedIds(new Set());
            },
            onError: (error) => {
              notifications.show({
                title: t("common.error"),
                message: error.message,
                color: "red",
              });
            },
          },
        );
      },
    });
  };

  const handleDelete = (id: string, studentName: string, monthName: string) => {
    modals.openConfirmModal({
      title: t("tuition.deleteTitle"),
      children: (
        <Text size="sm">
          {t.rich("tuition.deleteConfirm", {
            period: monthName,
            name: studentName,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
      ),
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteTuition.mutate(id, {
          onSuccess: () => {
            notifications.show({
              title: t("common.deleted"),
              message: t("tuition.deleteSuccess"),
              color: "green",
            });
          },
          onError: (error) => {
            notifications.show({
              title: t("common.error"),
              message: error.message,
              color: "red",
            });
          },
        });
      },
    });
  };

  const classOptions =
    classesData?.classes.map((c) => ({
      value: c.id,
      label: c.className,
    })) || [];

  // Build period options grouped by frequency type
  const periodOptions = [
    {
      group: t("tuition.monthly"),
      items: PERIODS.MONTHLY.map((p) => ({
        value: p,
        label: getPeriodDisplayName(p),
      })),
    },
    {
      group: t("tuition.quarterly"),
      items: PERIODS.QUARTERLY.map((p) => ({
        value: p,
        label: getPeriodDisplayName(p),
      })),
    },
    {
      group: t("tuition.semester"),
      items: PERIODS.SEMESTER.map((p) => ({
        value: p,
        label: getPeriodDisplayName(p),
      })),
    },
  ];

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Group gap="md" grow>
          <Select
            placeholder={t("tuition.selectAcademicYear")}
            leftSection={<IconFilter size={16} />}
            data={
              academicYearsData?.academicYears.map((ay) => ({
                value: ay.id,
                label: `${ay.year}${ay.isActive ? ` (${t("academicYear.statuses.active")})` : ""}`,
              })) || []
            }
            value={selectedYearId ?? ""}
            onChange={(value) => {
              setFilter("academicYearId", value || null);
              setFilter("classAcademicId", null);
            }}
            clearable
          />
          <Select
            placeholder={t("tuition.filterByClass")}
            leftSection={<IconFilter size={16} />}
            data={classOptions}
            value={filters.classAcademicId ?? ""}
            onChange={(value) => setFilter("classAcademicId", value || null)}
            clearable
            searchable
            disabled={!selectedYearId}
          />
          <Select
            placeholder={t("student.schoolLevel")}
            data={SCHOOL_LEVELS.map((s) => ({ value: s, label: s }))}
            value={schoolLevel}
            onChange={(v) =>
              setFilter(
                "schoolLevel",
                (v as "TK" | "SD" | "SMP" | "SMA") || null,
              )
            }
            clearable
          />
          <Select
            placeholder={t("tuition.filterByStatus")}
            data={[
              { value: "UNPAID", label: t("tuition.status.unpaid") },
              { value: "PARTIAL", label: t("tuition.status.partial") },
              { value: "PAID", label: t("tuition.status.paid") },
              { value: "VOID", label: t("tuition.status.void") },
            ]}
            value={filters.status ?? ""}
            onChange={(value) =>
              setFilter("status", (value as PaymentStatus | null) || null)
            }
            clearable
          />
          <Select
            placeholder={t("tuition.filterByPeriod")}
            data={periodOptions}
            value={filters.period ?? ""}
            onChange={(value) => setFilter("period", value || null)}
            clearable
            searchable
          />
          <TextInput
            placeholder={t("tuition.searchStudent")}
            leftSection={<IconSearch size={16} />}
            value={drafts.studentSearch ?? ""}
            onChange={(e) =>
              setFilter("studentSearch", e.currentTarget.value || null)
            }
            style={{ flexGrow: 0 }}
          />
          <Group gap="xs" style={{ flexGrow: 0 }}>
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => refetch()}
              loading={isFetching}
            >
              <IconRefresh size={18} />
            </ActionIcon>
            <ColumnSettingsDrawer tableId="tuitions" columnDefs={columnDefs} />
          </Group>
        </Group>
      </Paper>

      {selectedIds.size > 0 && (
        <Paper withBorder p="sm" bg="blue.0">
          <Group justify="space-between">
            <Group gap="sm">
              <Text size="sm" fw={500}>
                {t("tuition.massUpdate.selected", {
                  count: selectedIds.size,
                })}
              </Text>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                <IconX size={14} />
              </ActionIcon>
            </Group>
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                color="gray"
                onClick={() => handleMassUpdate("VOID")}
                loading={massUpdate.isPending}
              >
                {t("tuition.massUpdate.markVoid")}
              </Button>
              <Button
                size="xs"
                variant="light"
                color="red"
                onClick={() => handleMassUpdate("UNPAID")}
                loading={massUpdate.isPending}
              >
                {t("tuition.massUpdate.markUnpaid")}
              </Button>
              <Button
                size="xs"
                variant="light"
                color="green"
                onClick={() => handleMassUpdate("PAID")}
                loading={massUpdate.isPending}
              >
                {t("tuition.massUpdate.markPaid")}
              </Button>
            </Group>
          </Group>
        </Paper>
      )}

      <Paper withBorder>
        <Table.ScrollContainer minWidth={900}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={toggleAll}
                    size="xs"
                  />
                </Table.Th>
                {orderedKeys.map((key) => {
                  switch (key) {
                    case "student":
                      return (
                        <Table.Th key={key}>{t("tuition.student")}</Table.Th>
                      );
                    case "class":
                      return (
                        <Table.Th key={key}>{t("tuition.class")}</Table.Th>
                      );
                    case "period":
                      return (
                        <Table.Th key={key}>{t("tuition.period")}</Table.Th>
                      );
                    case "feeAmount":
                      return (
                        <Table.Th key={key} ta="right">
                          {t("tuition.feeAmount")}
                        </Table.Th>
                      );
                    case "discountAmount":
                      return (
                        <Table.Th key={key} ta="right">
                          {t("tuition.discountAmount")}
                        </Table.Th>
                      );
                    case "paidAmount":
                      return (
                        <Table.Th key={key} ta="right">
                          {t("tuition.paidAmount")}
                        </Table.Th>
                      );
                    case "dueDate":
                      return (
                        <Table.Th key={key}>{t("tuition.dueDate")}</Table.Th>
                      );
                    case "status":
                      return (
                        <Table.Th key={key}>{t("common.status")}</Table.Th>
                      );
                    case "actions":
                      return (
                        <Table.Th key={key} w={80}>
                          {t("common.actions")}
                        </Table.Th>
                      );
                    default:
                      return null;
                  }
                })}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <Table.Tr key={`skeleton-${i}`}>
                    <Table.Td>
                      <Skeleton height={20} width={20} />
                    </Table.Td>
                    {Array.from({ length: orderedKeys.length }).map((_, j) => (
                      <Table.Td key={`skeleton-cell-${j}`}>
                        <Skeleton height={20} />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              {!isLoading && data?.tuitions.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={orderedKeys.length + 1}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("tuition.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.tuitions.map((tuition) => (
                <Table.Tr
                  key={tuition.id}
                  bg={
                    selectedIds.has(tuition.id)
                      ? "var(--mantine-color-blue-light)"
                      : undefined
                  }
                >
                  <Table.Td>
                    <Checkbox
                      checked={selectedIds.has(tuition.id)}
                      onChange={() => toggleOne(tuition.id)}
                      size="xs"
                    />
                  </Table.Td>
                  {orderedKeys.map((key) => {
                    switch (key) {
                      case "student":
                        return (
                          <Table.Td key={key}>
                            <Stack gap={0}>
                              <Text size="sm" fw={500}>
                                {tuition.student?.name}
                              </Text>
                              <Text size="xs" c="dimmed">
                                NIS {tuition.student?.nis}
                                {tuition.student?.schoolLevel
                                  ? ` · ${tuition.student.schoolLevel}`
                                  : ""}
                              </Text>
                            </Stack>
                          </Table.Td>
                        );
                      case "class":
                        return (
                          <Table.Td key={key}>
                            <Text size="sm">
                              {tuition.classAcademic?.className}
                            </Text>
                          </Table.Td>
                        );
                      case "period":
                        return (
                          <Table.Td key={key}>
                            <Text size="sm">
                              {getPeriodDisplayName(tuition.period)}{" "}
                              {tuition.year}
                            </Text>
                          </Table.Td>
                        );
                      case "feeAmount":
                        return (
                          <Table.Td key={key} ta="right">
                            <NumberFormatter
                              value={tuition.feeAmount}
                              prefix="Rp "
                              thousandSeparator="."
                              decimalSeparator=","
                            />
                          </Table.Td>
                        );
                      case "discountAmount":
                        return (
                          <Table.Td key={key} ta="right">
                            {tuition.discount ? (
                              <Tooltip label={tuition.discount.name}>
                                <Badge color="green" variant="light" size="sm">
                                  -
                                  <NumberFormatter
                                    value={tuition.discountAmount}
                                    prefix="Rp "
                                    thousandSeparator="."
                                    decimalSeparator=","
                                  />
                                </Badge>
                              </Tooltip>
                            ) : (
                              <Text size="sm" c="dimmed">
                                -
                              </Text>
                            )}
                          </Table.Td>
                        );
                      case "paidAmount":
                        return (
                          <Table.Td key={key} ta="right">
                            <NumberFormatter
                              value={tuition.paidAmount}
                              prefix="Rp "
                              thousandSeparator="."
                              decimalSeparator=","
                            />
                          </Table.Td>
                        );
                      case "dueDate":
                        return (
                          <Table.Td key={key}>
                            <Text size="sm">
                              {dayjs(tuition.dueDate).format("DD/MM/YYYY")}
                            </Text>
                          </Table.Td>
                        );
                      case "status":
                        return (
                          <Table.Td key={key}>
                            <Badge
                              color={STATUS_COLORS[tuition.status]}
                              variant="light"
                            >
                              {t(
                                `tuition.status.${tuition.status.toLowerCase()}`,
                              )}
                            </Badge>
                          </Table.Td>
                        );
                      case "actions":
                        return (
                          <Table.Td key={key}>
                            <Group gap="xs">
                              <Tooltip label={t("common.delete")}>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  onClick={() =>
                                    handleDelete(
                                      tuition.id,
                                      tuition.student?.name || "",
                                      getPeriodDisplayName(tuition.period),
                                    )
                                  }
                                  disabled={(tuition._count?.payments ?? 0) > 0}
                                >
                                  <IconTrash size={18} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        );
                      default:
                        return null;
                    }
                  })}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {data && (
        <TablePagination
          total={data.pagination.totalPages}
          value={page}
          onChange={setPage}
        />
      )}
    </Stack>
  );
}
