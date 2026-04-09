"use client";

import {
  ActionIcon,
  Group,
  Pagination,
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
import { useDeleteStudent, useStudents } from "@/hooks/api/useStudents";
import { useQueryParams } from "@/hooks/useQueryParams";

export default function StudentTable() {
  const t = useTranslations();
  const router = useRouter();
  const { setParams, getParam, getNumParam } = useQueryParams();
  const page = getNumParam("page", 1)!;
  const search = getParam("search", "") ?? "";

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
      <TextInput
        placeholder={t("student.searchPlaceholder")}
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => {
          setParams({ search: e.currentTarget.value, page: 1 });
        }}
      />

      <Paper withBorder>
        <Table.ScrollContainer minWidth={700}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("student.nis")}</Table.Th>
                <Table.Th>{t("student.name")}</Table.Th>
                <Table.Th>{t("student.parent")}</Table.Th>
                <Table.Th>{t("student.phone")}</Table.Th>
                <Table.Th>{t("student.joinDate")}</Table.Th>
                <Table.Th w={100}>{t("common.actions")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <Table.Tr key={`skeleton-${i}`}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <Table.Td key={`skeleton-cell-${j}`}>
                        <Skeleton height={20} />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              {!isLoading && data?.students.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("student.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.students.map((student) => (
                <Table.Tr key={student.nis}>
                  <Table.Td>{student.nis}</Table.Td>
                  <Table.Td>{student.name}</Table.Td>
                  <Table.Td>{student.parentName}</Table.Td>
                  <Table.Td>{student.parentPhone}</Table.Td>
                  <Table.Td>
                    {dayjs(student.startJoinDate).format("DD/MM/YYYY")}
                  </Table.Td>
                  <Table.Td>
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
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {data && data.pagination.totalPages > 1 && (
        <Group justify="center">
          <Pagination
            total={data.pagination.totalPages}
            value={page}
            onChange={(p) => setParams({ page: p })}
          />
        </Group>
      )}
    </Stack>
  );
}
