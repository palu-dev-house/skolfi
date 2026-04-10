"use client";

import {
  ActionIcon,
  Badge,
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
  IconSearch,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ColumnSettingsDrawer, { useColumnSettings } from "@/components/ui/ColumnSettingsDrawer";
import TablePagination from "@/components/ui/TablePagination";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import {
  useClassAcademics,
  useDeleteClassAcademic,
} from "@/hooks/api/useClassAcademics";
import { useQueryParams } from "@/hooks/useQueryParams";

export default function ClassAcademicTable() {
  const t = useTranslations();
  const router = useRouter();
  const { setParams, getParam, getNumParam } = useQueryParams();
  const page = getNumParam("page", 1)!;
  const search = getParam("search", "") ?? "";
  const academicYearFilter = getParam("academicYearId") ?? null;

  const columnDefs = [
    { key: "name", label: t("class.name") },
    { key: "grade", label: t("class.grade") },
    { key: "section", label: t("class.section") },
    { key: "academicYear", label: t("class.academicYear") },
    { key: "students", label: t("class.students") },
    { key: "actions", label: t("common.actions") },
  ];
  const { visibleKeys, orderedKeys } = useColumnSettings("classAcademics", columnDefs);

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });

  const { data, isLoading } = useClassAcademics({
    page,
    limit: 10,
    search: search || undefined,
    academicYearId: academicYearFilter || undefined,
  });

  const deleteClass = useDeleteClassAcademic();

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
          value={search}
          onChange={(e) => {
            setParams({ search: e.currentTarget.value, page: 1 });
          }}
          style={{ flex: 1 }}
        />
        <Select
          placeholder={t("class.filterByYear")}
          data={academicYearOptions}
          value={academicYearFilter}
          onChange={(value) => {
            setParams({ academicYearId: value, page: 1 });
          }}
          clearable
          searchable
          w={200}
        />
        <ColumnSettingsDrawer tableId="classAcademics" columnDefs={columnDefs} />
      </Group>

      <Paper withBorder>
        <Table.ScrollContainer minWidth={700}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {orderedKeys.map((key) => {
                  switch (key) {
                    case "name": return <Table.Th key={key}>{t("class.name")}</Table.Th>;
                    case "grade": return <Table.Th key={key}>{t("class.grade")}</Table.Th>;
                    case "section": return <Table.Th key={key}>{t("class.section")}</Table.Th>;
                    case "academicYear": return <Table.Th key={key}>{t("class.academicYear")}</Table.Th>;
                    case "students": return <Table.Th key={key}>{t("class.students")}</Table.Th>;
                    case "actions": return <Table.Th key={key} w={120}>{t("common.actions")}</Table.Th>;
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
              {!isLoading && data?.classes.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={orderedKeys.length}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("class.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.classes.map((cls) => (
                <Table.Tr key={cls.id}>
                  {orderedKeys.map((key) => {
                    switch (key) {
                      case "name": return <Table.Td key={key} fw={600}>{cls.className}</Table.Td>;
                      case "grade": return <Table.Td key={key}>{cls.grade}</Table.Td>;
                      case "section": return <Table.Td key={key}>{cls.section}</Table.Td>;
                      case "academicYear": return <Table.Td key={key}>{cls.academicYear?.year}</Table.Td>;
                      case "students": return (
                        <Table.Td key={key}>
                          <Badge
                            variant="light"
                            color={cls._count?.studentClasses ? "blue" : "gray"}
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
                      case "actions": return (
                        <Table.Td key={key}>
                          <Group gap="xs">
                            <Tooltip label={t("class.manageStudents")}>
                              <ActionIcon
                                variant="subtle"
                                color="teal"
                                onClick={() =>
                                  router.push(`/admin/classes/${cls.id}/students`)
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
                                onClick={() => handleDelete(cls.id, cls.className)}
                              >
                                <IconTrash size={18} />
                              </ActionIcon>
                            </Tooltip>
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
