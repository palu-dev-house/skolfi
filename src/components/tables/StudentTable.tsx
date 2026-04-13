"use client";

import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  Paper,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconCalendar,
  IconEdit,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useState } from "react";
import ColumnSettingsDrawer, {
  useColumnSettings,
} from "@/components/ui/ColumnSettingsDrawer";
import TablePagination from "@/components/ui/TablePagination";
import {
  useBulkDeleteStudents,
  useBulkUpdateStudents,
  useDeleteStudent,
  useStudents,
} from "@/hooks/api/useStudents";
import { useQueryParams } from "@/hooks/useQueryParams";

export default function StudentTable() {
  const t = useTranslations();
  const router = useRouter();
  const { setParams, getParam, getNumParam } = useQueryParams();
  const page = getNumParam("page", 1)!;
  const search = getParam("search", "") ?? "";

  const [selectedNis, setSelectedNis] = useState<Set<string>>(new Set());

  const columnDefs = [
    { key: "nis", label: t("student.nis") },
    { key: "name", label: t("student.name") },
    { key: "parent", label: t("student.parent") },
    { key: "phone", label: t("student.phone") },
    { key: "joinDate", label: t("student.joinDate") },
    { key: "actions", label: t("common.actions") },
  ];

  const { orderedKeys } = useColumnSettings("students", columnDefs);

  const { data, isLoading, refetch, isFetching } = useStudents({
    page,
    limit: 10,
    search: search || undefined,
  });

  const deleteStudent = useDeleteStudent();
  const bulkDelete = useBulkDeleteStudents();
  const bulkUpdate = useBulkUpdateStudents();

  const studentNisList = data?.students.map((s) => s.nis) || [];
  const allSelected =
    studentNisList.length > 0 &&
    studentNisList.every((nis) => selectedNis.has(nis));
  const someSelected = studentNisList.some((nis) => selectedNis.has(nis));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedNis(new Set());
    } else {
      setSelectedNis(new Set(studentNisList));
    }
  };

  const toggleOne = (nis: string) => {
    setSelectedNis((prev) => {
      const next = new Set(prev);
      if (next.has(nis)) next.delete(nis);
      else next.add(nis);
      return next;
    });
  };

  const handleBulkDelete = () => {
    const nisList = Array.from(selectedNis);
    modals.openConfirmModal({
      title: t("student.bulk.deleteTitle"),
      children: (
        <Text size="sm">
          {t("student.bulk.deleteConfirm", { count: nisList.length })}
        </Text>
      ),
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        bulkDelete.mutate(nisList, {
          onSuccess: (result) => {
            notifications.show({
              title: t("common.success"),
              message: t("student.bulk.deleteSuccess", {
                deleted: result.deleted,
              }),
              color: "green",
            });
            if (result.skipped.length > 0) {
              notifications.show({
                title: t("common.warning"),
                message: t("student.bulk.deleteSkipped", {
                  count: result.skipped.length,
                  names: result.skipped.map((s) => s.name).join(", "),
                }),
                color: "orange",
                autoClose: 8000,
              });
            }
            setSelectedNis(new Set());
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

  const handleBulkUpdateJoinDate = () => {
    const nisList = Array.from(selectedNis);

    modals.open({
      title: t("student.bulk.updateTitle"),
      children: (
        <BulkUpdateJoinDateForm
          nisList={nisList}
          onSuccess={(count) => {
            setSelectedNis(new Set());
            notifications.show({
              title: t("common.success"),
              message: t("student.bulk.updateSuccess", { count }),
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

  const handleDelete = (nis: string, name: string) => {
    modals.openConfirmModal({
      title: t("student.deleteTitle"),
      children: (
        <Text size="sm">
          {t.rich("student.deleteConfirm", {
            name,
            nis,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
      ),
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteStudent.mutate(nis, {
          onSuccess: () => {
            notifications.show({
              title: t("common.deleted"),
              message: t("student.deleteSuccess"),
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

  return (
    <Stack gap="md">
      <Group gap="md">
        <TextInput
          placeholder={t("student.searchPlaceholder")}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => {
            setParams({ search: e.currentTarget.value, page: 1 });
          }}
          style={{ flex: 1 }}
        />
        <ActionIcon
          variant="default"
          size="lg"
          onClick={() => refetch()}
          loading={isFetching}
        >
          <IconRefresh size={18} />
        </ActionIcon>
        <ColumnSettingsDrawer tableId="students" columnDefs={columnDefs} />
      </Group>

      {selectedNis.size > 0 && (
        <Paper withBorder p="sm" bg="blue.0">
          <Group justify="space-between">
            <Group gap="sm">
              <Text size="sm" fw={500}>
                {t("student.bulk.selected", { count: selectedNis.size })}
              </Text>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => setSelectedNis(new Set())}
              >
                <IconX size={14} />
              </ActionIcon>
            </Group>
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                leftSection={<IconCalendar size={14} />}
                onClick={handleBulkUpdateJoinDate}
                loading={bulkUpdate.isPending}
              >
                {t("student.bulk.update")}
              </Button>
              <Button
                size="xs"
                variant="light"
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={handleBulkDelete}
                loading={bulkDelete.isPending}
              >
                {t("student.bulk.delete")}
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
                    case "nis":
                      return <Table.Th key={key}>{t("student.nis")}</Table.Th>;
                    case "name":
                      return <Table.Th key={key}>{t("student.name")}</Table.Th>;
                    case "parent":
                      return (
                        <Table.Th key={key}>{t("student.parent")}</Table.Th>
                      );
                    case "phone":
                      return (
                        <Table.Th key={key}>{t("student.phone")}</Table.Th>
                      );
                    case "joinDate":
                      return (
                        <Table.Th key={key}>{t("student.joinDate")}</Table.Th>
                      );
                    case "actions":
                      return (
                        <Table.Th key={key} w={100}>
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
              {!isLoading && data?.students.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={orderedKeys.length + 1}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("student.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.students.map((student) => (
                <Table.Tr
                  key={student.nis}
                  bg={
                    selectedNis.has(student.nis)
                      ? "var(--mantine-color-blue-light)"
                      : undefined
                  }
                >
                  <Table.Td>
                    <Checkbox
                      checked={selectedNis.has(student.nis)}
                      onChange={() => toggleOne(student.nis)}
                      size="xs"
                    />
                  </Table.Td>
                  {orderedKeys.map((key) => {
                    switch (key) {
                      case "nis":
                        return <Table.Td key={key}>{student.nis}</Table.Td>;
                      case "name":
                        return <Table.Td key={key}>{student.name}</Table.Td>;
                      case "parent":
                        return (
                          <Table.Td key={key}>{student.parentName}</Table.Td>
                        );
                      case "phone":
                        return (
                          <Table.Td key={key}>{student.parentPhone}</Table.Td>
                        );
                      case "joinDate":
                        return (
                          <Table.Td key={key}>
                            {dayjs(student.startJoinDate).format("DD/MM/YYYY")}
                          </Table.Td>
                        );
                      case "actions":
                        return (
                          <Table.Td key={key}>
                            <Group gap="xs">
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                onClick={() =>
                                  router.push(`/admin/students/${student.nis}`)
                                }
                              >
                                <IconEdit size={18} />
                              </ActionIcon>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() =>
                                  handleDelete(student.nis, student.name)
                                }
                              >
                                <IconTrash size={18} />
                              </ActionIcon>
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
          onChange={(p) => setParams({ page: p })}
        />
      )}
    </Stack>
  );
}

function BulkUpdateJoinDateForm({
  nisList,
  onSuccess,
  onError,
}: {
  nisList: string[];
  onSuccess: (count: number) => void;
  onError: (msg: string) => void;
}) {
  const t = useTranslations();
  const [date, setDate] = useState<Date | null>(null);
  const bulkUpdate = useBulkUpdateStudents();

  return (
    <Stack gap="md">
      <Text size="sm">
        {t("student.bulk.updateConfirm", { count: nisList.length })}
      </Text>
      <DatePickerInput
        label={t("student.joinDate")}
        placeholder={t("student.joinDate")}
        leftSection={<IconCalendar size={16} />}
        value={date}
        onChange={(val) => setDate(val as Date | null)}
        valueFormat="DD/MM/YYYY"
      />
      <Group justify="flex-end" gap="xs">
        <Button variant="default" onClick={() => modals.closeAll()}>
          {t("common.cancel")}
        </Button>
        <Button
          disabled={!date}
          loading={bulkUpdate.isPending}
          onClick={() => {
            if (!date) return;
            bulkUpdate.mutate(
              {
                nisList,
                updates: {
                  startJoinDate: dayjs(date).format("YYYY-MM-DD"),
                },
              },
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
