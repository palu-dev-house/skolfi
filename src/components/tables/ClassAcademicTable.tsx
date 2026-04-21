"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
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
  IconEdit,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import ColumnSettingsDrawer, {
  useColumnSettings,
} from "@/components/ui/ColumnSettingsDrawer";
import TablePagination from "@/components/ui/TablePagination";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import {
  useBulkDeleteClassAcademics,
  useClassAcademics,
  useDeleteClassAcademic,
} from "@/hooks/api/useClassAcademics";
import { useQueryFilters } from "@/hooks/useQueryFilters";

const filtersSchema = z.object({
  search: z.string().optional(),
  academicYearId: z.string().optional(),
});

export default function ClassAcademicTable() {
  const t = useTranslations();
  const router = useRouter();
  const { filters, page, drafts, setFilter, setPage } = useQueryFilters({
    schema: filtersSchema,
  });
  const search = filters.search ?? "";
  const academicYearFilter = filters.academicYearId ?? null;

  const columnDefs = [
    { key: "name", label: t("class.name") },
    { key: "schoolLevel", label: t("student.schoolLevel") },
    { key: "grade", label: t("class.grade") },
    { key: "section", label: t("class.section") },
    { key: "academicYear", label: t("class.academicYear") },
    { key: "students", label: t("class.students") },
    { key: "actions", label: t("common.actions") },
  ];
  const { visibleKeys, orderedKeys } = useColumnSettings(
    "classAcademics",
    columnDefs,
  );

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });

  const { data, isLoading, refetch, isFetching } = useClassAcademics({
    page,
    limit: 10,
    search: search || undefined,
    academicYearId: academicYearFilter || undefined,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const deleteClass = useDeleteClassAcademic();
  const bulkDelete = useBulkDeleteClassAcademics();

  const classIds = data?.classes.map((c) => c.id) || [];
  const allSelected =
    classIds.length > 0 && classIds.every((id) => selectedIds.has(id));
  const someSelected = classIds.some((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(classIds));
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
      title: t("class.bulk.deleteTitle"),
      children: (
        <Text size="sm">
          {t("class.bulk.deleteConfirm", { count: ids.length })}
        </Text>
      ),
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        bulkDelete.mutate(ids, {
          onSuccess: (result) => {
            notifications.show({
              title: t("common.success"),
              message: t("class.bulk.deleteSuccess", {
                deleted: result.deleted,
              }),
              color: "green",
            });
            if (result.skipped.length > 0) {
              notifications.show({
                title: t("common.warning"),
                message: t("class.bulk.deleteSkipped", {
                  count: result.skipped.length,
                  names: result.skipped.map((s) => s.className).join(", "),
                }),
                color: "orange",
                autoClose: 8000,
              });
            }
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

  const handleDelete = (id: string, className: string) => {
    modals.openConfirmModal({
      title: t("class.deleteTitle"),
      children: (
        <Text size="sm">
          {t.rich("class.deleteConfirm", {
            className,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
      ),
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteClass.mutate(id, {
          onSuccess: () => {
            notifications.show({
              title: t("common.deleted"),
              message: t("class.deleteSuccess"),
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

  const academicYearOptions =
    academicYearsData?.academicYears.map((ay) => ({
      value: ay.id,
      label: ay.year,
    })) || [];

  return (
    <Stack gap="md">
      <Group>
        <TextInput
          placeholder={t("class.searchPlaceholder")}
          leftSection={<IconSearch size={16} />}
          value={drafts.search}
          onChange={(e) => setFilter("search", e.currentTarget.value || null)}
          style={{ flex: 1 }}
        />
        <Select
          placeholder={t("class.filterByYear")}
          data={academicYearOptions}
          value={academicYearFilter}
          onChange={(value) => setFilter("academicYearId", value || null)}
          clearable
          searchable
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
          tableId="classAcademics"
          columnDefs={columnDefs}
        />
      </Group>

      {selectedIds.size > 0 && (
        <Paper withBorder p="sm" bg="blue.0">
          <Group justify="space-between">
            <Group gap="sm">
              <Text size="sm" fw={500}>
                {t("class.bulk.selected", { count: selectedIds.size })}
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
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={handleBulkDelete}
                loading={bulkDelete.isPending}
              >
                {t("class.bulk.delete")}
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
                    case "name":
                      return <Table.Th key={key}>{t("class.name")}</Table.Th>;
                    case "schoolLevel":
                      return (
                        <Table.Th key={key}>
                          {t("student.schoolLevel")}
                        </Table.Th>
                      );
                    case "grade":
                      return <Table.Th key={key}>{t("class.grade")}</Table.Th>;
                    case "section":
                      return (
                        <Table.Th key={key}>{t("class.section")}</Table.Th>
                      );
                    case "academicYear":
                      return (
                        <Table.Th key={key}>{t("class.academicYear")}</Table.Th>
                      );
                    case "students":
                      return (
                        <Table.Th key={key}>{t("class.students")}</Table.Th>
                      );
                    case "actions":
                      return (
                        <Table.Th key={key} w={120}>
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
              {!isLoading && data?.classes.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={orderedKeys.length + 1}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("class.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.classes.map((cls) => (
                <Table.Tr
                  key={cls.id}
                  bg={
                    selectedIds.has(cls.id)
                      ? "var(--mantine-color-blue-light)"
                      : undefined
                  }
                >
                  <Table.Td>
                    <Checkbox
                      checked={selectedIds.has(cls.id)}
                      onChange={() => toggleOne(cls.id)}
                      size="xs"
                    />
                  </Table.Td>
                  {orderedKeys.map((key) => {
                    switch (key) {
                      case "name":
                        return (
                          <Table.Td key={key} fw={600}>
                            {cls.className}
                          </Table.Td>
                        );
                      case "schoolLevel":
                        return (
                          <Table.Td key={key}>
                            <Badge variant="light">{cls.schoolLevel}</Badge>
                          </Table.Td>
                        );
                      case "grade":
                        return <Table.Td key={key}>{cls.grade}</Table.Td>;
                      case "section":
                        return <Table.Td key={key}>{cls.section}</Table.Td>;
                      case "academicYear":
                        return (
                          <Table.Td key={key}>
                            {cls.academicYear?.year}
                          </Table.Td>
                        );
                      case "students":
                        return (
                          <Table.Td key={key}>
                            <Badge
                              variant="light"
                              color={
                                cls._count?.studentClasses ? "blue" : "gray"
                              }
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                router.push(`/admin/classes/${cls.id}/students`)
                              }
                            >
                              {t("class.studentsCount", {
                                count: cls._count?.studentClasses ?? 0,
                              })}
                            </Badge>
                          </Table.Td>
                        );
                      case "actions":
                        return (
                          <Table.Td key={key}>
                            <Group gap="xs">
                              <Tooltip label={t("class.manageStudents")}>
                                <ActionIcon
                                  variant="subtle"
                                  color="teal"
                                  onClick={() =>
                                    router.push(
                                      `/admin/classes/${cls.id}/students`,
                                    )
                                  }
                                >
                                  <IconUsers size={18} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label={t("class.edit")}>
                                <ActionIcon
                                  variant="subtle"
                                  color="blue"
                                  onClick={() =>
                                    router.push(`/admin/classes/${cls.id}`)
                                  }
                                >
                                  <IconEdit size={18} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label={t("common.delete")}>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  onClick={() =>
                                    handleDelete(cls.id, cls.className)
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
