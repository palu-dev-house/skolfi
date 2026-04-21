"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  NumberFormatter,
  NumberInput,
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
  IconCurrencyDollar,
  IconFilter,
  IconRefresh,
  IconSearch,
  IconToggleLeft,
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
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { useClassAcademics } from "@/hooks/api/useClassAcademics";
import {
  useBulkDeleteScholarships,
  useBulkUpdateScholarships,
  useDeleteScholarship,
  useScholarships,
} from "@/hooks/api/useScholarships";
import { useQueryFilters } from "@/hooks/useQueryFilters";

const scholarshipFiltersSchema = z.object({
  classAcademicId: z.string().optional(),
  schoolLevel: z.enum(["TK", "SD", "SMP", "SMA"]).optional(),
  studentSearch: z.string().optional(),
  isFullScholarship: z.enum(["true", "false"]).optional(),
});

const SCHOOL_LEVELS = ["TK", "SD", "SMP", "SMA"] as const;

export default function ScholarshipTable() {
  const t = useTranslations();
  const { filters, page, drafts, setFilter, setPage } = useQueryFilters({
    schema: scholarshipFiltersSchema,
    debounceKeys: ["studentSearch"],
  });
  const classAcademicId = filters.classAcademicId ?? null;
  const schoolLevel = filters.schoolLevel ?? null;
  const studentSearch = filters.studentSearch ?? "";
  const isFullScholarship = filters.isFullScholarship ?? null;

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });
  const activeYear = academicYearsData?.academicYears.find((ay) => ay.isActive);

  const { data: classesData } = useClassAcademics({
    limit: 100,
    academicYearId: activeYear?.id,
  });

  const { data, isLoading, refetch, isFetching } = useScholarships({
    page,
    limit: 10,
    classAcademicId: classAcademicId || undefined,
    schoolLevel: schoolLevel ?? undefined,
    studentId: studentSearch || undefined,
    isFullScholarship:
      isFullScholarship === null ? undefined : isFullScholarship === "true",
  });

  const columnDefs = [
    { key: "student", label: t("scholarship.student") },
    { key: "class", label: t("scholarship.class") },
    { key: "amount", label: t("scholarship.amount") },
    { key: "type", label: t("scholarship.type") },
    { key: "created", label: t("scholarship.created") },
    { key: "actions", label: t("common.actions") },
  ];
  const { visibleKeys, orderedKeys } = useColumnSettings(
    "scholarships",
    columnDefs,
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const deleteScholarship = useDeleteScholarship();
  const bulkDelete = useBulkDeleteScholarships();
  const bulkUpdate = useBulkUpdateScholarships();

  const scholarshipIds = data?.scholarships.map((s) => s.id) || [];
  const allSelected =
    scholarshipIds.length > 0 &&
    scholarshipIds.every((id) => selectedIds.has(id));
  const someSelected = scholarshipIds.some((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(scholarshipIds));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    modals.openConfirmModal({
      title: t("scholarship.bulk.deleteTitle"),
      children: (
        <Text size="sm">
          {t("scholarship.bulk.deleteConfirm", { count: ids.length })}
        </Text>
      ),
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        bulkDelete.mutate(ids, {
          onSuccess: (result) => {
            notifications.show({
              title: t("common.success"),
              message: t("scholarship.bulk.deleteSuccess", {
                deleted: result.deleted,
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
        });
      },
    });
  };

  const handleBulkUpdateAmount = () => {
    const ids = Array.from(selectedIds);
    modals.open({
      title: t("scholarship.bulk.updateAmountTitle"),
      children: (
        <BulkUpdateAmountForm
          ids={ids}
          onSuccess={(count) => {
            setSelectedIds(new Set());
            notifications.show({
              title: t("common.success"),
              message: t("scholarship.bulk.updateSuccess", { count }),
              color: "green",
            });
          }}
          onError={(msg) => {
            notifications.show({
              title: t("common.error"),
              message: msg,
              color: "red",
            });
          }}
        />
      ),
    });
  };

  const handleBulkToggleType = (markFull: boolean) => {
    const ids = Array.from(selectedIds);
    bulkUpdate.mutate(
      { ids, updates: { isFullScholarship: markFull } },
      {
        onSuccess: (result) => {
          notifications.show({
            title: t("common.success"),
            message: t("scholarship.bulk.updateSuccess", {
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
  };

  const handleDelete = (id: string, studentName: string) => {
    modals.openConfirmModal({
      title: t("scholarship.deleteTitle"),
      children: (
        <Stack gap="xs">
          <Text size="sm">
            {t.rich("scholarship.deleteConfirm", {
              name: studentName,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </Text>
          <Text size="sm" c="dimmed">
            {t("scholarship.deleteNote")}
          </Text>
        </Stack>
      ),
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteScholarship.mutate(id, {
          onSuccess: () => {
            notifications.show({
              title: t("common.deleted"),
              message: t("scholarship.deleteSuccess"),
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

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Group gap="md">
          <TextInput
            placeholder={t("scholarship.searchStudent")}
            leftSection={<IconSearch size={16} />}
            value={drafts.studentSearch ?? ""}
            onChange={(e) =>
              setFilter("studentSearch", e.currentTarget.value || null)
            }
            w={240}
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
            w={140}
          />
          <Select
            placeholder={t("scholarship.filterByClass")}
            leftSection={<IconFilter size={16} />}
            data={classOptions}
            value={classAcademicId}
            onChange={(value) => setFilter("classAcademicId", value || null)}
            clearable
            searchable
            w={250}
          />
          <Select
            placeholder={t("scholarship.filterByType")}
            data={[
              { value: "true", label: t("scholarship.types.FULL") },
              { value: "false", label: t("scholarship.types.PARTIAL") },
            ]}
            value={isFullScholarship}
            onChange={(value) =>
              setFilter(
                "isFullScholarship",
                (value as "true" | "false" | null) || null,
              )
            }
            clearable
            w={200}
          />
          <ActionIcon
            variant="default"
            size="lg"
            onClick={() => refetch()}
            loading={isFetching}
          >
            <IconRefresh size={18} />
          </ActionIcon>
          <ColumnSettingsDrawer
            tableId="scholarships"
            columnDefs={columnDefs}
          />
        </Group>
      </Paper>

      {selectedIds.size > 0 && (
        <Paper withBorder p="sm" bg="blue.0">
          <Group justify="space-between">
            <Group gap="sm">
              <Text size="sm" fw={500}>
                {t("scholarship.bulk.selected", { count: selectedIds.size })}
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
                color="blue"
                leftSection={<IconCurrencyDollar size={14} />}
                onClick={handleBulkUpdateAmount}
                loading={bulkUpdate.isPending}
              >
                {t("scholarship.bulk.updateAmount")}
              </Button>
              <Button
                size="xs"
                variant="light"
                color="teal"
                leftSection={<IconToggleLeft size={14} />}
                onClick={() => handleBulkToggleType(true)}
                loading={bulkUpdate.isPending}
              >
                {t("scholarship.bulk.markFull")}
              </Button>
              <Button
                size="xs"
                variant="light"
                color="teal"
                leftSection={<IconToggleLeft size={14} />}
                onClick={() => handleBulkToggleType(false)}
                loading={bulkUpdate.isPending}
              >
                {t("scholarship.bulk.markPartial")}
              </Button>
              <Button
                size="xs"
                variant="light"
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={handleBulkDelete}
                loading={bulkDelete.isPending}
              >
                {t("scholarship.bulk.delete")}
              </Button>
            </Group>
          </Group>
        </Paper>
      )}

      <Paper withBorder>
        <Table.ScrollContainer minWidth={700}>
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
                        <Table.Th key={key}>
                          {t("scholarship.student")}
                        </Table.Th>
                      );
                    case "class":
                      return (
                        <Table.Th key={key}>{t("scholarship.class")}</Table.Th>
                      );
                    case "amount":
                      return (
                        <Table.Th key={key} ta="right" align="right">
                          {t("scholarship.amount")}
                        </Table.Th>
                      );
                    case "type":
                      return (
                        <Table.Th key={key}>{t("scholarship.type")}</Table.Th>
                      );
                    case "created":
                      return (
                        <Table.Th key={key}>
                          {t("scholarship.created")}
                        </Table.Th>
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
              {!isLoading && data?.scholarships.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={orderedKeys.length + 1}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("scholarship.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.scholarships.map((scholarship) => (
                <Table.Tr
                  key={scholarship.id}
                  bg={
                    selectedIds.has(scholarship.id)
                      ? "var(--mantine-color-blue-light)"
                      : undefined
                  }
                >
                  <Table.Td>
                    <Checkbox
                      checked={selectedIds.has(scholarship.id)}
                      onChange={() => toggleOne(scholarship.id)}
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
                                {scholarship.student?.name}
                              </Text>
                              <Text size="xs" c="dimmed">
                                NIS {scholarship.student?.nis}
                                {scholarship.student?.schoolLevel
                                  ? ` · ${scholarship.student.schoolLevel}`
                                  : ""}
                              </Text>
                            </Stack>
                          </Table.Td>
                        );
                      case "class":
                        return (
                          <Table.Td key={key}>
                            <Text size="sm">
                              {scholarship.classAcademic?.className}
                            </Text>
                          </Table.Td>
                        );
                      case "amount":
                        return (
                          <Table.Td key={key} ta="right" align="right">
                            <NumberFormatter
                              value={scholarship.nominal}
                              prefix="Rp "
                              thousandSeparator="."
                              decimalSeparator=","
                            />
                          </Table.Td>
                        );
                      case "type":
                        return (
                          <Table.Td key={key}>
                            <Badge
                              color={
                                scholarship.isFullScholarship ? "green" : "blue"
                              }
                              variant="light"
                            >
                              {scholarship.isFullScholarship
                                ? t("scholarship.full")
                                : t("scholarship.partial")}
                            </Badge>
                          </Table.Td>
                        );
                      case "created":
                        return (
                          <Table.Td key={key}>
                            <Text size="sm">
                              {dayjs(scholarship.createdAt).format(
                                "DD/MM/YYYY",
                              )}
                            </Text>
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
                                      scholarship.id,
                                      scholarship.student?.name || "",
                                    )
                                  }
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

function BulkUpdateAmountForm({
  ids,
  onSuccess,
  onError,
}: {
  ids: string[];
  onSuccess: (count: number) => void;
  onError: (msg: string) => void;
}) {
  const t = useTranslations();
  const [amount, setAmount] = useState<string | number>("");
  const bulkUpdate = useBulkUpdateScholarships();

  return (
    <Stack gap="md">
      <Text size="sm">
        {t("scholarship.bulk.updateAmountConfirm", { count: ids.length })}
      </Text>
      <NumberInput
        label={t("scholarship.amount")}
        placeholder={t("scholarship.nominalPlaceholder")}
        value={amount}
        onChange={setAmount}
        min={0}
        prefix="Rp "
        thousandSeparator="."
        decimalSeparator=","
      />
      <Group justify="flex-end" gap="xs">
        <Button variant="default" onClick={() => modals.closeAll()}>
          {t("common.cancel")}
        </Button>
        <Button
          disabled={!amount || Number(amount) <= 0}
          loading={bulkUpdate.isPending}
          onClick={() => {
            if (!amount || Number(amount) <= 0) return;
            bulkUpdate.mutate(
              { ids, updates: { nominal: Number(amount) } },
              {
                onSuccess: (result) => {
                  modals.closeAll();
                  onSuccess(result.updated);
                },
                onError: (error) => {
                  onError(error.message);
                },
              },
            );
          }}
        >
          {t("common.save")}
        </Button>
      </Group>
    </Stack>
  );
}
