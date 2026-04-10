"use client";

import {
  ActionIcon,
  Badge,
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
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconFilter, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import ColumnSettingsDrawer, { useColumnSettings } from "@/components/ui/ColumnSettingsDrawer";
import TablePagination from "@/components/ui/TablePagination";
import { useAcademicYears } from "@/hooks/api/useAcademicYears";
import { useClassAcademics } from "@/hooks/api/useClassAcademics";
import {
  useDeleteScholarship,
  useScholarships,
} from "@/hooks/api/useScholarships";
import { useQueryParams } from "@/hooks/useQueryParams";

export default function ScholarshipTable() {
  const t = useTranslations();
  const { setParams, getParam, getNumParam } = useQueryParams();
  const page = getNumParam("page", 1)!;
  const classAcademicId = getParam("classAcademicId") ?? null;
  const isFullScholarship = getParam("isFullScholarship") ?? null;

  const { data: academicYearsData } = useAcademicYears({ limit: 100 });
  const activeYear = academicYearsData?.academicYears.find((ay) => ay.isActive);

  const { data: classesData } = useClassAcademics({
    limit: 100,
    academicYearId: activeYear?.id,
  });

  const { data, isLoading } = useScholarships({
    page,
    limit: 10,
    classAcademicId: classAcademicId || undefined,
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
  const { visibleKeys, orderedKeys } = useColumnSettings("scholarships", columnDefs);

  const deleteScholarship = useDeleteScholarship();

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
          <Select
            placeholder={t("scholarship.filterByClass")}
            leftSection={<IconFilter size={16} />}
            data={classOptions}
            value={classAcademicId}
            onChange={(value) => setParams({ classAcademicId: value, page: 1 })}
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
              setParams({ isFullScholarship: value, page: 1 })
            }
            clearable
            w={200}
          />
          <ColumnSettingsDrawer tableId="scholarships" columnDefs={columnDefs} />
        </Group>
      </Paper>

      <Paper withBorder>
        <Table.ScrollContainer minWidth={700}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {orderedKeys.map((key) => {
                  switch (key) {
                    case "student": return <Table.Th key={key}>{t("scholarship.student")}</Table.Th>;
                    case "class": return <Table.Th key={key}>{t("scholarship.class")}</Table.Th>;
                    case "amount": return <Table.Th key={key} ta="right" align="right">{t("scholarship.amount")}</Table.Th>;
                    case "type": return <Table.Th key={key}>{t("scholarship.type")}</Table.Th>;
                    case "created": return <Table.Th key={key}>{t("scholarship.created")}</Table.Th>;
                    case "actions": return <Table.Th key={key} w={80}>{t("common.actions")}</Table.Th>;
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
              {!isLoading && data?.scholarships.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={orderedKeys.length}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("scholarship.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.scholarships.map((scholarship) => (
                <Table.Tr key={scholarship.id}>
                  {orderedKeys.map((key) => {
                    switch (key) {
                      case "student": return (
                        <Table.Td key={key}>
                          <Stack gap={0}>
                            <Text size="sm" fw={500}>
                              {scholarship.student?.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {scholarship.studentNis}
                            </Text>
                          </Stack>
                        </Table.Td>
                      );
                      case "class": return (
                        <Table.Td key={key}>
                          <Text size="sm">
                            {scholarship.classAcademic?.className}
                          </Text>
                        </Table.Td>
                      );
                      case "amount": return (
                        <Table.Td key={key} ta="right" align="right">
                          <NumberFormatter
                            value={scholarship.nominal}
                            prefix="Rp "
                            thousandSeparator="."
                            decimalSeparator=","
                          />
                        </Table.Td>
                      );
                      case "type": return (
                        <Table.Td key={key}>
                          <Badge
                            color={scholarship.isFullScholarship ? "green" : "blue"}
                            variant="light"
                          >
                            {scholarship.isFullScholarship
                              ? t("scholarship.full")
                              : t("scholarship.partial")}
                          </Badge>
                        </Table.Td>
                      );
                      case "created": return (
                        <Table.Td key={key}>
                          <Text size="sm">
                            {dayjs(scholarship.createdAt).format("DD/MM/YYYY")}
                          </Text>
                        </Table.Td>
                      );
                      case "actions": return (
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
