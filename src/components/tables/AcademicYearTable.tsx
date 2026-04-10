"use client";

import {
  ActionIcon,
  Badge,
  Group,
  Paper,
  Skeleton,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconEdit,
  IconRefresh,
  IconStar,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ColumnSettingsDrawer, {
  useColumnSettings,
} from "@/components/ui/ColumnSettingsDrawer";
import TablePagination from "@/components/ui/TablePagination";
import {
  useAcademicYears,
  useDeleteAcademicYear,
  useSetActiveAcademicYear,
} from "@/hooks/api/useAcademicYears";
import { useQueryParams } from "@/hooks/useQueryParams";

export default function AcademicYearTable() {
  const t = useTranslations();
  const router = useRouter();
  const { setParams, getNumParam } = useQueryParams();
  const page = getNumParam("page", 1)!;

  const columnDefs = [
    { key: "year", label: t("academicYear.year") },
    { key: "startDate", label: t("academicYear.startDate") },
    { key: "endDate", label: t("academicYear.endDate") },
    { key: "classes", label: t("class.title") },
    { key: "status", label: t("common.status") },
    { key: "actions", label: t("common.actions") },
  ];
  const { visibleKeys, orderedKeys } = useColumnSettings(
    "academicYears",
    columnDefs,
  );

  const { data, isLoading, refetch, isFetching } = useAcademicYears({ page, limit: 10 });

  const deleteAcademicYear = useDeleteAcademicYear();
  const setActive = useSetActiveAcademicYear();

  const handleDelete = (id: string, year: string) => {
    modals.openConfirmModal({
      title: t("academicYear.deleteTitle"),
      children: (
        <Text size="sm">
          {t.rich("academicYear.deleteConfirm", {
            year,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
      ),
      labels: { confirm: t("common.delete"), cancel: t("common.cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteAcademicYear.mutate(id, {
          onSuccess: () => {
            notifications.show({
              title: t("common.deleted"),
              message: t("academicYear.deleteSuccess"),
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

  const handleSetActive = (id: string, year: string) => {
    modals.openConfirmModal({
      title: t("academicYear.setActiveTitle"),
      children: (
        <Text size="sm">
          {t.rich("academicYear.setActiveConfirm", {
            year,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
      ),
      labels: {
        confirm: t("academicYear.setActive"),
        cancel: t("common.cancel"),
      },
      confirmProps: { color: "blue" },
      onConfirm: () => {
        setActive.mutate(id, {
          onSuccess: () => {
            notifications.show({
              title: t("common.updated"),
              message: t("academicYear.setActiveSuccess", { year }),
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
      <Group justify="flex-end" gap="xs">
        <ActionIcon variant="default" size="lg" onClick={() => refetch()} loading={isFetching}>
          <IconRefresh size={18} />
        </ActionIcon>
        <ColumnSettingsDrawer tableId="academicYears" columnDefs={columnDefs} />
      </Group>

      <Paper withBorder>
        <Table.ScrollContainer minWidth={600}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {orderedKeys.map((key) => {
                  switch (key) {
                    case "year":
                      return (
                        <Table.Th key={key}>{t("academicYear.year")}</Table.Th>
                      );
                    case "startDate":
                      return (
                        <Table.Th key={key}>
                          {t("academicYear.startDate")}
                        </Table.Th>
                      );
                    case "endDate":
                      return (
                        <Table.Th key={key}>
                          {t("academicYear.endDate")}
                        </Table.Th>
                      );
                    case "classes":
                      return <Table.Th key={key}>{t("class.title")}</Table.Th>;
                    case "status":
                      return (
                        <Table.Th key={key}>{t("common.status")}</Table.Th>
                      );
                    case "actions":
                      return (
                        <Table.Th key={key} w={140}>
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
                    {Array.from({ length: orderedKeys.length }).map((_, j) => (
                      <Table.Td key={`skeleton-cell-${j}`}>
                        <Skeleton height={20} />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              {!isLoading && data?.academicYears.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={orderedKeys.length}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("academicYear.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.academicYears.map((ay) => (
                <Table.Tr key={ay.id}>
                  {orderedKeys.map((key) => {
                    switch (key) {
                      case "year":
                        return (
                          <Table.Td key={key} fw={600}>
                            {ay.year}
                          </Table.Td>
                        );
                      case "startDate":
                        return (
                          <Table.Td key={key}>
                            {dayjs(ay.startDate).format("DD/MM/YYYY")}
                          </Table.Td>
                        );
                      case "endDate":
                        return (
                          <Table.Td key={key}>
                            {dayjs(ay.endDate).format("DD/MM/YYYY")}
                          </Table.Td>
                        );
                      case "classes":
                        return (
                          <Table.Td key={key}>
                            {ay._count?.classAcademics ?? 0}
                          </Table.Td>
                        );
                      case "status":
                        return (
                          <Table.Td key={key}>
                            {ay.isActive ? (
                              <Badge color="green" variant="light">
                                {t("academicYear.statuses.active")}
                              </Badge>
                            ) : (
                              <Badge color="gray" variant="light">
                                {t("academicYear.statuses.inactive")}
                              </Badge>
                            )}
                          </Table.Td>
                        );
                      case "actions":
                        return (
                          <Table.Td key={key}>
                            <Group gap="xs">
                              <Tooltip
                                label={
                                  ay.isActive
                                    ? t("academicYear.active")
                                    : t("academicYear.setActive")
                                }
                              >
                                <ActionIcon
                                  variant="subtle"
                                  color={ay.isActive ? "yellow" : "gray"}
                                  onClick={() =>
                                    !ay.isActive &&
                                    handleSetActive(ay.id, ay.year)
                                  }
                                  disabled={ay.isActive}
                                >
                                  {ay.isActive ? (
                                    <IconStarFilled size={18} />
                                  ) : (
                                    <IconStar size={18} />
                                  )}
                                </ActionIcon>
                              </Tooltip>
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                onClick={() =>
                                  router.push(`/admin/academic-years/${ay.id}`)
                                }
                              >
                                <IconEdit size={18} />
                              </ActionIcon>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() => handleDelete(ay.id, ay.year)}
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
