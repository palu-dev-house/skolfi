"use client";

import {
  ActionIcon,
  Badge,
  Group,
  Pagination,
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
  IconStar,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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

  const { data, isLoading } = useAcademicYears({ page, limit: 10 });

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
      <Paper withBorder>
        <Table.ScrollContainer minWidth={600}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("academicYear.year")}</Table.Th>
                <Table.Th>{t("academicYear.startDate")}</Table.Th>
                <Table.Th>{t("academicYear.endDate")}</Table.Th>
                <Table.Th>{t("class.title")}</Table.Th>
                <Table.Th>{t("common.status")}</Table.Th>
                <Table.Th w={140}>{t("common.actions")}</Table.Th>
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
              {!isLoading && data?.academicYears.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" c="dimmed" py="md">
                      {t("academicYear.notFound")}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {data?.academicYears.map((ay) => (
                <Table.Tr key={ay.id}>
                  <Table.Td fw={600}>{ay.year}</Table.Td>
                  <Table.Td>
                    {dayjs(ay.startDate).format("DD/MM/YYYY")}
                  </Table.Td>
                  <Table.Td>{dayjs(ay.endDate).format("DD/MM/YYYY")}</Table.Td>
                  <Table.Td>{ay._count?.classAcademics ?? 0}</Table.Td>
                  <Table.Td>
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
                  <Table.Td>
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
                            !ay.isActive && handleSetActive(ay.id, ay.year)
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
