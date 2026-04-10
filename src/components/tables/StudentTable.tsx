"use client";

import {
  ActionIcon,
  Group,
  Paper,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconSearch, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ColumnSettingsDrawer, { useColumnSettings } from "@/components/ui/ColumnSettingsDrawer";
import TablePagination from "@/components/ui/TablePagination";
import { useDeleteStudent, useStudents } from "@/hooks/api/useStudents";
import { useQueryParams } from "@/hooks/useQueryParams";

export default function StudentTable() {
  const t = useTranslations();
  const router = useRouter();
  const { setParams, getParam, getNumParam } = useQueryParams();
  const page = getNumParam("page", 1)!;
  const search = getParam("search", "") ?? "";

  const columnDefs = [
    { key: "nis", label: t("student.nis") },
    { key: "name", label: t("student.name") },
    { key: "parent", label: t("student.parent") },
    { key: "phone", label: t("student.phone") },
    { key: "joinDate", label: t("student.joinDate") },
    { key: "actions", label: t("common.actions") },
  ];

  const { visibleKeys, orderedKeys } = useColumnSettings("students", columnDefs);

  const { data, isLoading } = useStudents({
    page,
    limit: 10,
    search: search || undefined,
  });

  const deleteStudent = useDeleteStudent();

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
        <ColumnSettingsDrawer tableId="students" columnDefs={columnDefs} />
      </Group>

      <Paper withBorder>
        <Table.ScrollContainer minWidth={700}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {orderedKeys.map((key) => {
                  switch (key) {
                    case "nis": return <Table.Th key={key}>{t("student.nis")}</Table.Th>;
                    case "name": return <Table.Th key={key}>{t("student.name")}</Table.Th>;
                    case "parent": return <Table.Th key={key}>{t("student.parent")}</Table.Th>;
                    case "phone": return <Table.Th key={key}>{t("student.phone")}</Table.Th>;
                    case "joinDate": return <Table.Th key={key}>{t("student.joinDate")}</Table.Th>;
                    case "actions": return <Table.Th key={key} w={100}>{t("common.actions")}</Table.Th>;
                    default: return null;
                  }
                })}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <Table.Tr key={`skeleton-${i}`}>
                    {Array.from({ length: orderedKeys.length }).map((_, j) => (
                      <Table.Td key={`skeleton-cell-${j}`}>
                        <Skeleton height={20} />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              {!isLoading && data?.students.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={orderedKeys.length}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("student.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.students.map((student) => (
                <Table.Tr key={student.nis}>
                  {orderedKeys.map((key) => {
                    switch (key) {
                      case "nis": return <Table.Td key={key}>{student.nis}</Table.Td>;
                      case "name": return <Table.Td key={key}>{student.name}</Table.Td>;
                      case "parent": return <Table.Td key={key}>{student.parentName}</Table.Td>;
                      case "phone": return <Table.Td key={key}>{student.parentPhone}</Table.Td>;
                      case "joinDate": return <Table.Td key={key}>{dayjs(student.startJoinDate).format("DD/MM/YYYY")}</Table.Td>;
                      case "actions": return (
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
                              onClick={() => handleDelete(student.nis, student.name)}
                            >
                              <IconTrash size={18} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      );
                      default: return null;
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
